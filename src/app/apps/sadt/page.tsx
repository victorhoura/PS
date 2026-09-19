"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  gerarSadt,
  LINHAS_HISTORIA,
  LINHAS_PROCEDIMENTO,
  type DadosSadt,
} from "@/lib/sadt";
import { emMaiusculas, hoje, nomeDeArquivo, validarData } from "@/lib/pdf";
import { avisarCopia } from "@/components/AvisoCopia";
import { Bloco, Campo, Erro } from "@/components/FormularioPdf";

const CHAVE_PADROES = "ps-japa:sadt:padroes";
const REQUISITANTE_PADRAO = "HMU";
const MUNICIPIO_PADRAO = "GUARULHOS";

/** Os campos de texto simples; os procedimentos são uma lista à parte. */
type Simples = Exclude<keyof DadosSadt, "procedimentos">;
type Campos = Record<Simples, string> & { procedimentos: string[] };

const VAZIO: Campos = {
  requisitante: REQUISITANTE_PADRAO,
  cartaoSus: "",
  paciente: "",
  nascimento: "",
  mae: "",
  endereco: "",
  municipio: MUNICIPIO_PADRAO,
  hd: "",
  cid: "",
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
  const quadro = useRef<HTMLIFrameElement>(null);

  // Data de hoje e o que ficou da última vez só entram depois da hidratação:
  // mudam de máquina para máquina e o HTML do servidor não os conhece.
  useEffect(() => {
    let padroes = { requisitante: REQUISITANTE_PADRAO, municipio: MUNICIPIO_PADRAO };
    try {
      padroes = { ...padroes, ...JSON.parse(localStorage.getItem(CHAVE_PADROES) || "{}") };
    } catch {
      // Sem armazenamento valem os padrões.
    }
    setCampos((c) => ({ ...c, ...padroes, data: c.data || hoje() }));
  }, []);

  useEffect(() => () => { if (pdf) URL.revokeObjectURL(pdf.url); }, [pdf]);

  function mudar(campo: Simples, valor: string) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setErros((e) => (e[campo] ? { ...e, [campo]: undefined } : e));
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
      mae: emMaiusculas(campos.mae),
      endereco: emMaiusculas(campos.endereco),
      municipio: emMaiusculas(campos.municipio),
      hd: emMaiusculas(campos.hd),
      cid: emMaiusculas(campos.cid),
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

      try {
        localStorage.setItem(
          CHAVE_PADROES,
          JSON.stringify({ requisitante: dados.requisitante, municipio: dados.municipio }),
        );
      } catch {
        // Não vale falhar a geração por causa disso.
      }
    } catch {
      setFalha(
        "Não deu para montar o PDF. Se for a primeira vez neste computador, abra o app uma vez com internet para o formulário ficar guardado.",
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
    <div className="p-4 lg:p-6">
      <header className="mb-4">
        <h1 className="font-mono text-base font-bold tracking-[0.16em] text-ink">GERADOR DE SADT</h1>
        <p className="mt-0.5 text-[11px] text-inkDim">
          Requisição de serviços de diagnóstico do HMU, pronta para imprimir. Nada sai deste
          computador.
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
              className="transicao flex-1 rounded-lg bg-accent px-4 py-2.5 text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110 disabled:opacity-40"
            >
              {gerando ? "GERANDO…" : "GERAR SADT"}
            </button>
            <button
              type="button"
              onClick={limpar}
              className="transicao rounded-lg border border-edge bg-panel px-4 py-2.5 text-[12px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
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
              REQUISIÇÃO
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
                  className="transicao flex-1 rounded-lg bg-accent px-4 py-2.5 text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110"
                >
                  IMPRIMIR
                </button>
                <button
                  onClick={baixar}
                  className="transicao rounded-lg border border-edge bg-panel px-4 py-2.5 text-[12px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
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
    </div>
  );
}
