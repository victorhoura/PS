"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gerarApac, LINHAS_JUSTIFICATIVA, quantidadeValida, type DadosApac } from "@/lib/apac";
import {
  emMaiusculas,
  emMaiusculasMultilinha,
  hoje,
  nomeDeArquivo,
  validarData,
} from "@/lib/pdf";
import { useModelosApac } from "@/hooks/useModelos";
import { GerenciadorModelos } from "@/components/GerenciadorModelos";
import { carregarPreferencias, definirPreferencia, preferenciasAtuais } from "@/lib/preferencias";
import { avisarCopia } from "@/components/AvisoCopia";
import { Bloco, Campo, Erro } from "@/components/FormularioPdf";
import { IconeEditar } from "@/components/Icones";

const MEDICO_PADRAO = "VICTOR M. HOURA";

type Campos = Record<keyof DadosApac, string>;

const VAZIO: Campos = {
  paciente: "",
  nascimento: "",
  exame: "",
  quantidade: "1",
  exameSec1: "",
  quantidadeSec1: "",
  exameSec2: "",
  quantidadeSec2: "",
  diagnostico: "",
  cid: "",
  cidSecundario: "",
  justificativa: "",
  medico: MEDICO_PADRAO,
  solicitacao: "",
};

/**
 * Gerador de APAC.
 *
 * O laudo sai com a sua letra de máquina em cima do formulário oficial, como
 * saía no programa em Python — só que sem instalar nada e sem pasta de saída:
 * o PDF nasce aqui no navegador, você confere na tela e imprime ou baixa.
 * Nenhum dado de paciente sai desta máquina — só o nome do médico
 * solicitante, que fica guardado para a próxima.
 */
export default function GeradorApac() {
  const [campos, setCampos] = useState<Campos>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof DadosApac, string>>>({});
  const [pdf, setPdf] = useState<{ url: string; nome: string } | null>(null);
  const [sobra, setSobra] = useState<string[]>([]);
  const [gerando, setGerando] = useState(false);
  const [falha, setFalha] = useState("");
  const [gerenciando, setGerenciando] = useState(false);
  const modelos = useModelosApac();
  const quadro = useRef<HTMLIFrameElement>(null);

  // Data de hoje e médico ficam para depois da hidratação: a data depende do
  // relógio e o médico vem da nuvem, e o HTML do servidor não conhece nenhum
  // dos dois.
  useEffect(() => {
    setCampos((c) => ({ ...c, solicitacao: c.solicitacao || hoje() }));
    void carregarPreferencias().then(() => {
      const medico = preferenciasAtuais().medico;
      if (medico) setCampos((c) => ({ ...c, medico }));
    });
  }, []);

  // Um PDF antigo na memória é um object URL vazando; some junto com a página.
  useEffect(() => () => { if (pdf) URL.revokeObjectURL(pdf.url); }, [pdf]);

  function mudar(campo: keyof DadosApac, valor: string) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setErros((e) => (e[campo] ? { ...e, [campo]: undefined } : e));
  }

  function aplicarModelo(id: string) {
    const m = modelos.find((x) => x.id === id);
    if (!m) return;
    setCampos((c) => ({
      ...c,
      exame: m.exame,
      diagnostico: m.diagnostico,
      cid: m.cid,
      justificativa: emMaiusculasMultilinha(m.justificativa),
    }));
    setErros({});
  }

  /** Normaliza tudo e diz o que falta. Devolve null quando algo está errado. */
  function conferir(): DadosApac | null {
    const d: DadosApac = {
      paciente: emMaiusculas(campos.paciente),
      nascimento: campos.nascimento.trim(),
      exame: emMaiusculas(campos.exame),
      quantidade: campos.quantidade.trim(),
      exameSec1: emMaiusculas(campos.exameSec1),
      quantidadeSec1: campos.quantidadeSec1.trim(),
      exameSec2: emMaiusculas(campos.exameSec2),
      quantidadeSec2: campos.quantidadeSec2.trim(),
      diagnostico: emMaiusculas(campos.diagnostico),
      cid: emMaiusculas(campos.cid),
      cidSecundario: emMaiusculas(campos.cidSecundario),
      justificativa: emMaiusculasMultilinha(campos.justificativa),
      medico: emMaiusculas(campos.medico),
      solicitacao: campos.solicitacao.trim(),
    };

    const e: Partial<Record<keyof DadosApac, string>> = {};

    for (const [campo, aviso] of [
      ["paciente", "Preencha o nome do paciente."],
      ["exame", "Preencha o exame principal."],
      ["diagnostico", "Preencha o diagnóstico."],
      ["cid", "Preencha o CID principal."],
      ["justificativa", "Preencha a justificativa."],
      ["medico", "Preencha o médico solicitante."],
    ] as const) {
      if (!d[campo]) e[campo] = aviso;
    }

    const nasc = validarData(d.nascimento);
    if (!nasc) e.nascimento = "Data inválida. Use DD/MM/AAAA.";
    else d.nascimento = nasc;

    const sol = validarData(d.solicitacao);
    if (!sol) e.solicitacao = "Data inválida. Use DD/MM/AAAA.";
    else d.solicitacao = sol;

    if (!quantidadeValida(d.quantidade)) e.quantidade = "De 1 a 99.";

    // A quantidade do secundário só é exigida quando há procedimento.
    if (d.exameSec1 && !quantidadeValida(d.quantidadeSec1)) e.quantidadeSec1 = "De 1 a 99.";
    if (d.exameSec2 && !quantidadeValida(d.quantidadeSec2)) e.quantidadeSec2 = "De 1 a 99.";

    setErros(e);
    if (Object.keys(e).length) return null;

    setCampos((c) => ({ ...c, ...d }));
    return d;
  }

  async function gerar() {
    setFalha("");
    const dados = conferir();
    if (!dados) return;

    setGerando(true);
    try {
      const resposta = await fetch("/APAC.pdf");
      if (!resposta.ok) throw new Error(`modelo ${resposta.status}`);

      const laudo = await gerarApac(dados, await resposta.arrayBuffer());
      const blob = new Blob([laudo.pdf as BlobPart], { type: "application/pdf" });

      if (pdf) URL.revokeObjectURL(pdf.url);
      setPdf({ url: URL.createObjectURL(blob), nome: nomeDeArquivo("APAC", dados.paciente, dados.solicitacao) });
      setSobra(laudo.sobra);

      definirPreferencia("medico", dados.medico);
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
    avisarCopia("APAC BAIXADA", true);
  }

  function imprimir() {
    // O leitor de PDF do navegador é um documento à parte; em alguns ele
    // aceita o print de fora, em outros não deixa nem olhar. Quando não
    // deixa, o laudo abre numa aba e imprime de lá.
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
    setCampos((c) => ({ ...VAZIO, medico: c.medico, solicitacao: hoje() }));
  }

  /** Quantas linhas a justificativa vai ocupar — o laudo tem seis. */
  const linhas = useMemo(
    () => emMaiusculasMultilinha(campos.justificativa).split("\n").length,
    [campos.justificativa],
  );

  return (
    // Mais larga que as outras páginas: formulário e laudo lado a lado.
    <div className="pagina max-w-7xl">
      <header className="mb-4">
        <h1 className="titulo-pagina">GERADOR DE APAC</h1>
        <p className="subtitulo">
          Preenche o laudo oficial e devolve o PDF pronto para imprimir. Nenhum dado de paciente sai
          deste computador.
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
                className="campo min-w-0 flex-1 cursor-pointer"
              >
                <option value="">
                  {modelos.length
                    ? "Escolha para preencher exame, diagnóstico, CID e justificativa…"
                    : "Nenhum modelo — use GERENCIAR para criar o primeiro"}
                </option>
                {modelos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
              {/* Abaixo de 360px fica só o lápis: com a palavra, a lista de
                  modelos ao lado encolhia até mostrar "Escolha para p". */}
              <button
                type="button"
                onClick={() => setGerenciando(true)}
                aria-label="Gerenciar modelos"
                title="Gerenciar modelos"
                className="botao botao-secundario w-9 px-0 min-[360px]:w-auto min-[360px]:px-3"
              >
                <IconeEditar tamanho={14} />
                <span className="hidden min-[360px]:inline">GERENCIAR</span>
              </button>
            </div>
          </Bloco>

          <Bloco titulo="PACIENTE">
            <Campo
              id="apac-paciente"
              rotulo="NOME DO PACIENTE"
              largura={4}
              valor={campos.paciente}
              erro={erros.paciente}
              aoMudar={(v) => mudar("paciente", v.toUpperCase())}
              autoFocus
            />
            <Campo
              id="apac-nascimento"
              rotulo="NASCIMENTO"
              largura={2}
              dica="DD/MM/AAAA"
              inputMode="numeric"
              valor={campos.nascimento}
              erro={erros.nascimento}
              aoMudar={(v) => mudar("nascimento", v)}
            />
          </Bloco>

          <Bloco titulo="PROCEDIMENTOS">
            <Campo
              id="apac-exame"
              rotulo="EXAME PRINCIPAL"
              largura={5}
              valor={campos.exame}
              erro={erros.exame}
              aoMudar={(v) => mudar("exame", v.toUpperCase())}
            />
            <Campo
              id="apac-quantidade"
              rotulo="QTDE."
              largura={1}
              inputMode="numeric"
              valor={campos.quantidade}
              erro={erros.quantidade}
              aoMudar={(v) => mudar("quantidade", v.replace(/\D/g, "").slice(0, 2))}
            />

            <Campo
              id="apac-exameSec1"
              rotulo="SECUNDÁRIO 1"
              largura={5}
              dica="opcional"
              valor={campos.exameSec1}
              aoMudar={(v) => {
                mudar("exameSec1", v.toUpperCase());
                // Preencher o procedimento sem a quantidade é o esquecimento
                // mais fácil de cometer; o 1 entra sozinho e some junto.
                if (v.trim() && !campos.quantidadeSec1) mudar("quantidadeSec1", "1");
                if (!v.trim()) mudar("quantidadeSec1", "");
              }}
            />
            <Campo
              id="apac-quantidadeSec1"
              rotulo="QTDE."
              largura={1}
              inputMode="numeric"
              valor={campos.quantidadeSec1}
              erro={erros.quantidadeSec1}
              aoMudar={(v) => mudar("quantidadeSec1", v.replace(/\D/g, "").slice(0, 2))}
            />

            <Campo
              id="apac-exameSec2"
              rotulo="SECUNDÁRIO 2"
              largura={5}
              dica="opcional"
              valor={campos.exameSec2}
              aoMudar={(v) => {
                mudar("exameSec2", v.toUpperCase());
                if (v.trim() && !campos.quantidadeSec2) mudar("quantidadeSec2", "1");
                if (!v.trim()) mudar("quantidadeSec2", "");
              }}
            />
            <Campo
              id="apac-quantidadeSec2"
              rotulo="QTDE."
              largura={1}
              inputMode="numeric"
              valor={campos.quantidadeSec2}
              erro={erros.quantidadeSec2}
              aoMudar={(v) => mudar("quantidadeSec2", v.replace(/\D/g, "").slice(0, 2))}
            />
          </Bloco>

          <Bloco titulo="DIAGNÓSTICO">
            <Campo
              id="apac-diagnostico"
              rotulo="DESCRIÇÃO"
              largura={3}
              valor={campos.diagnostico}
              erro={erros.diagnostico}
              aoMudar={(v) => mudar("diagnostico", v.toUpperCase())}
            />
            <Campo
              id="apac-cid"
              rotulo="CID PRINCIPAL"
              largura={1}
              valor={campos.cid}
              erro={erros.cid}
              aoMudar={(v) => mudar("cid", v.toUpperCase())}
            />
            <Campo
              id="apac-cidSecundario"
              rotulo="CID ASSOCIADO"
              largura={2}
              dica="opcional"
              valor={campos.cidSecundario}
              aoMudar={(v) => mudar("cidSecundario", v.toUpperCase())}
            />

            <div className="sm:col-span-6">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <label
                  htmlFor="justificativa"
                  className="rotulo"
                >
                  JUSTIFICATIVA CLÍNICA
                </label>
                <span
                  className={`tabular font-mono text-[10px] ${
                    linhas > LINHAS_JUSTIFICATIVA ? "text-danger" : "text-inkDim/70"
                  }`}
                >
                  {linhas} {linhas === 1 ? "parágrafo" : "parágrafos"}
                </span>
              </div>
              <textarea
                id="justificativa"
                rows={5}
                value={campos.justificativa}
                onChange={(e) => mudar("justificativa", e.target.value.toUpperCase())}
                spellCheck={false}
                className="campo resize-y font-mono text-[11px]"
              />
              {erros.justificativa && <Erro texto={erros.justificativa} />}
              <p className="nota mt-1">
                O campo do formulário tem {LINHAS_JUSTIFICATIVA} linhas. O que passar disso não é
                impresso, e o aviso aparece junto do laudo depois de gerar.
              </p>
            </div>
          </Bloco>

          <Bloco titulo="SOLICITANTE">
            <Campo
              id="apac-medico"
              rotulo="MÉDICO"
              largura={4}
              valor={campos.medico}
              erro={erros.medico}
              aoMudar={(v) => mudar("medico", v.toUpperCase())}
            />
            <Campo
              id="apac-solicitacao"
              rotulo="DATA DA SOLICITAÇÃO"
              largura={2}
              dica="DD/MM/AAAA"
              inputMode="numeric"
              valor={campos.solicitacao}
              erro={erros.solicitacao}
              aoMudar={(v) => mudar("solicitacao", v)}
            />
          </Bloco>

          <div className="rodape-acoes">
            <button type="submit" disabled={gerando} className="botao botao-primario w-full sm:w-auto sm:px-5">
              {gerando ? "GERANDO…" : "GERAR APAC"}
            </button>
            <button type="button" onClick={limpar} className="botao botao-secundario w-full sm:w-auto">
              LIMPAR
            </button>
          </div>

          {falha && (
            <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-[11px] leading-relaxed text-danger">
              {falha}
            </p>
          )}
        </form>

        <div className="min-w-0">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="rotulo">
              VISUALIZADOR
            </span>
            {pdf && <span className="truncate font-mono text-[10px] text-inkDim/70">{pdf.nome}</span>}
          </div>

          {pdf ? (
            <>
              <iframe
                ref={quadro}
                src={pdf.url}
                title="APAC gerada"
                className="h-[62vh] w-full rounded-xl border border-edge bg-panel shadow-cartao xl:h-[calc(100vh-14rem)]"
              />
              <div className="rodape-acoes mt-2.5">
                <button onClick={imprimir} className="botao botao-primario w-full sm:w-auto sm:px-5">
                  IMPRIMIR
                </button>
                <button onClick={baixar} className="botao botao-secundario w-full sm:w-auto">
                  BAIXAR
                </button>
              </div>
              {sobra.length > 0 && (
                <div
                  role="alert"
                  className="mt-2 rounded-xl border border-warn/30 bg-warn/10 p-3 text-[11px] leading-relaxed text-inkDim"
                >
                  <strong className="text-warn">A justificativa não coube inteira.</strong> O
                  formulário tem {LINHAS_JUSTIFICATIVA} linhas e{" "}
                  {sobra.length === 1 ? "sobrou 1 linha, que não foi impressa" : `sobraram ${sobra.length} linhas, que não foram impressas`}:
                  <span className="mt-1 block font-mono text-[10px] text-warn">
                    …{sobra.join(" ").slice(0, 160)}
                  </span>
                </div>
              )}

              <p className="nota mt-3">
                Confira o laudo na tela antes de assinar. O que não couber nos campos do formulário
                é encolhido até caber — e a justificativa para na sexta linha.
              </p>
            </>
          ) : (
            <div className="flex h-[40vh] items-center justify-center rounded-xl border border-dashed border-edge bg-panel/40 p-6 text-center xl:h-[calc(100vh-14rem)]">
              <p className="max-w-xs text-[11px] leading-relaxed text-inkDim">
                Preencha o formulário e clique em <strong className="text-ink">GERAR APAC</strong>.
                O laudo aparece aqui para conferência antes de imprimir.
              </p>
            </div>
          )}
        </div>
      </div>

      {gerenciando && (
        <GerenciadorModelos tipo="apac" modelos={modelos} aoFechar={() => setGerenciando(false)} />
      )}
    </div>
  );
}
