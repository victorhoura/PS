"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  gerarSadt,
  LINHAS_HISTORIA,
  LINHAS_PROCEDIMENTO,
  type DadosSadt,
  type Prioridade,
  type Sexo,
  type UnidadeIdade,
} from "@/lib/sadt";
import { emMaiusculas, hoje, nomeDeArquivo, validarData } from "@/lib/pdf";
import { carregarPreferencias, definirPreferencia, preferenciasAtuais } from "@/lib/preferencias";
import { avisarCopia } from "@/components/AvisoCopia";
import { Bloco, Campo, Erro, Opcoes } from "@/components/FormularioPdf";
import { useModelosSadt } from "@/hooks/useModelos";
import { GerenciadorModelos } from "@/components/GerenciadorModelos";

const SEXOS = [
  { valor: "F", texto: "FEM" },
  { valor: "M", texto: "MASC" },
] as const satisfies readonly { valor: Sexo; texto: string }[];

const PRIORIDADES = [
  { valor: "P0", texto: "P0 URGENTE" },
  { valor: "P1", texto: "P1 PRIORIDADE" },
  { valor: "P2", texto: "P2 ROTINA" },
] as const satisfies readonly { valor: Prioridade; texto: string }[];

const UNIDADES = [
  { valor: "a", texto: "ANOS" },
  { valor: "m", texto: "MESES" },
  { valor: "d", texto: "DIAS" },
] as const satisfies readonly { valor: UnidadeIdade; texto: string }[];

const REQUISITANTE_PADRAO = "HMU";
const MUNICIPIO_PADRAO = "GUARULHOS";

/** Os campos de texto simples; assinalar e procedimentos são à parte. */
type Simples = Exclude<
  keyof DadosSadt,
  "procedimentos" | "sexo" | "prioridade" | "idadeUnidade"
>;
type Campos = Record<Simples, string> & {
  sexo: Sexo;
  prioridade: Prioridade;
  idadeUnidade: UnidadeIdade;
  procedimentos: string[];
};

const VAZIO: Campos = {
  requisitante: REQUISITANTE_PADRAO,
  cartaoSus: "",
  paciente: "",
  nascimento: "",
  idade: "",
  idadeUnidade: "",
  sexo: "",
  mae: "",
  endereco: "",
  municipio: MUNICIPIO_PADRAO,
  hd: "",
  cid: "",
  prioridade: "",
  historia: "",
  data: "",
  procedimentos: [""],
};

/**
 * Gerador de SADT.
 *
 * Preenche a requisição do HMU e devolve o PDF para conferir e imprimir. O
 * formulário em branco vem do app e é preenchido aqui no navegador, então
 * cada requisição nasce limpa — ao contrário de reaproveitar um PDF já
 * preenchido, que carrega junto os dados do paciente anterior.
 */
export default function GeradorSadt() {
  const [campos, setCampos] = useState<Campos>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<Simples | "procedimentos", string>>>({});
  const [pdf, setPdf] = useState<{ url: string; nome: string } | null>(null);
  const [sobra, setSobra] = useState<string[]>([]);
  const [gerando, setGerando] = useState(false);
  const [falha, setFalha] = useState("");
  const [gerenciando, setGerenciando] = useState(false);
  const modelos = useModelosSadt();
  const quadro = useRef<HTMLIFrameElement>(null);

  // Data de hoje e o que ficou da última vez só entram depois da hidratação:
  // a data vem do relógio e os padrões vêm da nuvem.
  useEffect(() => {
    setCampos((c) => ({ ...c, data: c.data || hoje() }));
    void carregarPreferencias().then(() => {
      const sadt = preferenciasAtuais().sadt;
      if (!sadt) return;
      setCampos((c) => ({
        ...c,
        requisitante: sadt.requisitante || c.requisitante,
        municipio: sadt.municipio || c.municipio,
      }));
    });
  }, []);

  useEffect(() => () => { if (pdf) URL.revokeObjectURL(pdf.url); }, [pdf]);

  function mudar(campo: Simples, valor: string) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setErros((e) => (e[campo] ? { ...e, [campo]: undefined } : e));
  }

  /** Preenche HD, CID, história e procedimentos; o paciente fica como está. */
  function aplicarModelo(id: string) {
    const m = modelos.find((x) => x.id === id);
    if (!m) return;
    setCampos((c) => ({
      ...c,
      hd: m.hd,
      cid: m.cid,
      historia: m.historia,
      // Prioridade não vem do modelo: é juízo sobre o paciente da vez.
      procedimentos: m.procedimentos.length ? [...m.procedimentos] : [""],
    }));
    setErros({});
  }

  function mudarProcedimento(i: number, valor: string) {
    setCampos((c) => {
      const lista = [...c.procedimentos];
      lista[i] = valor;
      return { ...c, procedimentos: lista };
    });
    setErros((e) => (e.procedimentos ? { ...e, procedimentos: undefined } : e));
  }

  function conferir(): DadosSadt | null {
    const d: DadosSadt = {
      requisitante: emMaiusculas(campos.requisitante),
      cartaoSus: emMaiusculas(campos.cartaoSus),
      paciente: emMaiusculas(campos.paciente),
      nascimento: campos.nascimento.trim(),
      idade: campos.idade.trim(),
      idadeUnidade: campos.idadeUnidade,
      sexo: campos.sexo,
      mae: emMaiusculas(campos.mae),
      endereco: emMaiusculas(campos.endereco),
      municipio: emMaiusculas(campos.municipio),
      hd: emMaiusculas(campos.hd),
      cid: emMaiusculas(campos.cid),
      prioridade: campos.prioridade,
      historia: emMaiusculas(campos.historia),
      data: campos.data.trim(),
      procedimentos: campos.procedimentos.map(emMaiusculas).filter(Boolean),
    };

    const e: Partial<Record<Simples | "procedimentos", string>> = {};

    // Só exige o que impede a requisição de ser aceita. Cartão SUS, nome da
    // mãe e endereço ficam de fora: no plantão nem sempre estão à mão, e
    // travar a impressão por causa deles atrapalharia mais do que ajuda.
    for (const [campo, aviso] of [
      ["paciente", "Preencha o nome do paciente."],
      ["hd", "Preencha a hipótese diagnóstica."],
      ["cid", "Preencha o CID."],
      ["historia", "Preencha a história clínica."],
    ] as const) {
      if (!d[campo]) e[campo] = aviso;
    }

    const nasc = validarData(d.nascimento);
    if (!nasc) e.nascimento = "Data inválida. Use DD/MM/AAAA.";
    else d.nascimento = nasc;

    const data = validarData(d.data);
    if (!data) e.data = "Data inválida. Use DD/MM/AAAA.";
    else d.data = data;

    if (!d.procedimentos.length) e.procedimentos = "Informe ao menos um procedimento.";

    setErros(e);
    if (Object.keys(e).length) return null;

    setCampos((c) => ({ ...c, ...d, procedimentos: d.procedimentos.length ? d.procedimentos : [""] }));
    return d;
  }

  async function gerar() {
    setFalha("");
    const dados = conferir();
    if (!dados) return;

    setGerando(true);
    try {
      const resposta = await fetch("/SADT.pdf");
      if (!resposta.ok) throw new Error(`modelo ${resposta.status}`);

      const req = await gerarSadt(dados, await resposta.arrayBuffer());
      const blob = new Blob([req.pdf as BlobPart], { type: "application/pdf" });

      if (pdf) URL.revokeObjectURL(pdf.url);
      setPdf({ url: URL.createObjectURL(blob), nome: nomeDeArquivo("SADT", dados.paciente, dados.data) });
      setSobra(req.sobra);

      definirPreferencia("sadt", {
        requisitante: dados.requisitante,
        municipio: dados.municipio,
      });
    } catch {
      setFalha(
        "Não deu para montar o PDF: o formulário em branco não chegou. Confira a conexão e tente de novo.",
      );
    } finally {
      setGerando(false);
    }
  }

  function baixar() {
    if (!pdf) return;
    const a = document.createElement("a");
    a.href = pdf.url;
    a.download = pdf.nome;
    a.click();
    avisarCopia("SADT BAIXADA", true);
  }

  function imprimir() {
    try {
      const janela = quadro.current?.contentWindow;
      if (janela) {
        janela.focus();
        janela.print();
        return;
      }
    } catch {
      // cai para a aba nova
    }
    if (pdf) window.open(pdf.url, "_blank", "noopener");
  }

  function limpar() {
    if (pdf) URL.revokeObjectURL(pdf.url);
    setPdf(null);
    setSobra([]);
    setErros({});
    setFalha("");
    setCampos((c) => ({
      ...VAZIO,
      requisitante: c.requisitante,
      municipio: c.municipio,
      data: hoje(),
    }));
  }

  /** Linhas visíveis de procedimento: sempre uma a mais que as preenchidas. */
  const linhasProcedimento = useMemo(() => {
    const preenchidas = campos.procedimentos.filter((p) => p.trim()).length;
    return Math.min(Math.max(preenchidas + 1, campos.procedimentos.length), LINHAS_PROCEDIMENTO);
  }, [campos.procedimentos]);

  return (
    <div className="p-3 lg:p-4">
      <header className="mb-4">
        <h1 className="font-mono text-base font-bold tracking-[0.16em] text-ink">GERADOR DE SADT</h1>
        <p className="mt-0.5 text-[11px] text-inkDim">
          Requisição de serviços de diagnóstico do HMU, pronta para imprimir. Nenhum dado de paciente
          sai deste computador.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void gerar();
          }}
          className="min-w-0 space-y-5"
        >
          <Bloco titulo="MODELO PRONTO">
            <div className="flex gap-2 sm:col-span-6">
              <select
                aria-label="Modelo pronto"
                value=""
                onChange={(e) => aplicarModelo(e.target.value)}
                className="h-8 min-w-0 flex-1 rounded-lg border border-edge bg-panel px-2 text-[12px] text-ink outline-none focus:border-accent"
              >
                <option value="">
                  {modelos.length
                    ? "Escolha para preencher HD, CID, história e procedimentos…"
                    : "Nenhum modelo — use GERENCIAR para criar o primeiro"}
                </option>
                {modelos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setGerenciando(true)}
                className="transicao shrink-0 rounded-lg border border-edge bg-panel px-3 text-[11px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
              >
                GERENCIAR
              </button>
            </div>
          </Bloco>

          <Bloco titulo="PACIENTE">
            <Campo
              id="sadt-paciente"
              rotulo="NOME DO PACIENTE"
              largura={4}
              valor={campos.paciente}
              erro={erros.paciente}
              aoMudar={(v) => mudar("paciente", v.toUpperCase())}
              autoFocus
            />
            <Campo
              id="sadt-nascimento"
              rotulo="NASCIMENTO"
              largura={2}
              dica="DD/MM/AAAA"
              inputMode="numeric"
              valor={campos.nascimento}
              erro={erros.nascimento}
              aoMudar={(v) => mudar("nascimento", v)}
            />
            <Campo
              id="sadt-idade"
              rotulo="IDADE"
              largura={1}
              dica="opcional"
              inputMode="numeric"
              valor={campos.idade}
              aoMudar={(v) => mudar("idade", v.replace(/\D/g, "").slice(0, 3))}
            />
            <Opcoes
              rotulo="UNIDADE"
              largura={3}
              valor={campos.idadeUnidade}
              opcoes={UNIDADES}
              aoMudar={(v) => setCampos((c) => ({ ...c, idadeUnidade: v }))}
            />
            <Opcoes
              rotulo="SEXO"
              largura={2}
              valor={campos.sexo}
              opcoes={SEXOS}
              aoMudar={(v) => setCampos((c) => ({ ...c, sexo: v }))}
            />

            <Campo
              id="sadt-cartaoSus"
              rotulo="CARTÃO SUS"
              largura={3}
              dica="opcional"
              valor={campos.cartaoSus}
              aoMudar={(v) => mudar("cartaoSus", v.toUpperCase())}
            />
            <Campo
              id="sadt-mae"
              rotulo="NOME DA MÃE"
              largura={3}
              dica="opcional"
              valor={campos.mae}
              aoMudar={(v) => mudar("mae", v.toUpperCase())}
            />
            <Campo
              id="sadt-endereco"
              rotulo="ENDEREÇO"
              largura={4}
              dica="opcional"
              valor={campos.endereco}
              aoMudar={(v) => mudar("endereco", v.toUpperCase())}
            />
            <Campo
              id="sadt-municipio"
              rotulo="MUNICÍPIO"
              largura={2}
              valor={campos.municipio}
              aoMudar={(v) => mudar("municipio", v.toUpperCase())}
            />
          </Bloco>

          <Bloco titulo="DIAGNÓSTICO">
            <Campo
              id="sadt-hd"
              rotulo="HD"
              largura={4}
              valor={campos.hd}
              erro={erros.hd}
              aoMudar={(v) => mudar("hd", v.toUpperCase())}
            />
            <Campo
              id="sadt-cid"
              rotulo="CID"
              largura={2}
              valor={campos.cid}
              erro={erros.cid}
              aoMudar={(v) => mudar("cid", v.toUpperCase())}
            />
            <Opcoes
              rotulo="PRIORIDADE"
              largura={6}
              valor={campos.prioridade}
              opcoes={PRIORIDADES}
              aoMudar={(v) => setCampos((c) => ({ ...c, prioridade: v }))}
            />
            <Campo
              id="sadt-historia"
              rotulo="HISTÓRIA CLÍNICA"
              largura={6}
              valor={campos.historia}
              erro={erros.historia}
              aoMudar={(v) => mudar("historia", v.toUpperCase())}
            />
          </Bloco>

          <Bloco titulo="PROCEDIMENTOS">
            {Array.from({ length: linhasProcedimento }, (_, i) => (
              <Campo
                key={i}
                id={`sadt-procedimento-${i + 1}`}
                rotulo={i === 0 ? "PROCEDIMENTO" : `PROCEDIMENTO ${i + 1}`}
                largura={6}
                dica={i === 0 ? undefined : "opcional"}
                valor={campos.procedimentos[i] ?? ""}
                aoMudar={(v) => mudarProcedimento(i, v.toUpperCase())}
              />
            ))}
            {erros.procedimentos && (
              <div className="sm:col-span-6">
                <Erro texto={erros.procedimentos} />
              </div>
            )}
          </Bloco>

          <Bloco titulo="REQUISIÇÃO">
            <Campo
              id="sadt-requisitante"
              rotulo="UNIDADE REQUISITANTE"
              largura={4}
              valor={campos.requisitante}
              aoMudar={(v) => mudar("requisitante", v.toUpperCase())}
            />
            <Campo
              id="sadt-data"
              rotulo="DATA"
              largura={2}
              dica="DD/MM/AAAA"
              inputMode="numeric"
              valor={campos.data}
              erro={erros.data}
              aoMudar={(v) => mudar("data", v)}
            />
          </Bloco>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={gerando}
              className="transicao flex-1 rounded-lg bg-accent px-4 py-2 text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110 disabled:opacity-40"
            >
              {gerando ? "GERANDO…" : "GERAR SADT"}
            </button>
            <button
              type="button"
              onClick={limpar}
              className="transicao rounded-lg border border-edge bg-panel px-4 py-2 text-[12px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
            >
              LIMPAR
            </button>
          </div>

          {falha && (
            <p
              role="alert"
              className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-[11px] leading-relaxed text-danger"
            >
              {falha}
            </p>
          )}
        </form>

        <div className="min-w-0">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim">
              VISUALIZADOR
            </span>
            {pdf && <span className="truncate font-mono text-[10px] text-inkDim/70">{pdf.nome}</span>}
          </div>

          {pdf ? (
            <>
              <iframe
                ref={quadro}
                src={pdf.url}
                title="SADT gerada"
                className="h-[62vh] w-full rounded-lg border border-edge bg-panel xl:h-[calc(100vh-14rem)]"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={imprimir}
                  className="transicao flex-1 rounded-lg bg-accent px-4 py-2 text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110"
                >
                  IMPRIMIR
                </button>
                <button
                  onClick={baixar}
                  className="transicao rounded-lg border border-edge bg-panel px-4 py-2 text-[12px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
                >
                  BAIXAR
                </button>
              </div>

              {sobra.length > 0 && (
                <div
                  role="alert"
                  className="mt-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-[11px] leading-relaxed text-inkDim"
                >
                  <strong className="text-warn">A história clínica não coube inteira.</strong> O
                  formulário tem {LINHAS_HISTORIA} linhas e o resto não foi impresso:
                  <span className="mt-1 block font-mono text-[10px] text-warn">
                    …{sobra.join(" ").slice(0, 160)}
                  </span>
                </div>
              )}

              <p className="mt-3 text-[10px] leading-relaxed text-inkDim">
                Confira na tela antes de assinar. O que não couber na linha do formulário é
                encolhido até caber.
              </p>
            </>
          ) : (
            <div className="flex h-[40vh] items-center justify-center rounded-lg border border-dashed border-edge bg-panel/40 p-6 text-center xl:h-[calc(100vh-14rem)]">
              <p className="max-w-xs text-[11px] leading-relaxed text-inkDim">
                Preencha o formulário e clique em <strong className="text-ink">GERAR SADT</strong>.
                A requisição aparece aqui para conferência antes de imprimir.
              </p>
            </div>
          )}
        </div>
      </div>

      {gerenciando && (
        <GerenciadorModelos tipo="sadt" modelos={modelos} aoFechar={() => setGerenciando(false)} />
      )}
    </div>
  );
}
