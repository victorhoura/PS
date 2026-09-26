"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { copiar, copiarImagem } from "@/lib/clipboard";
import { imagemDaDivisao, resumoDaDivisao } from "@/lib/imagemPlantao";
import {
  FIM_PADRAO,
  MAX_PLANTONISTAS,
  MIN_PLANTONISTAS,
  dividirPlantao,
  duracao,
  foraDoCadastro,
  horaAtual,
  lerCadastrados,
  mesmoNome,
  nomeDoPlantonista,
  paraMinutos,
  textoDaDivisao,
  type Divisao,
} from "@/lib/plantao";
import {
  carregarPreferencias,
  definirPreferencia,
  inscreverPreferencias,
  preferenciasAtuais,
  preferenciasNoServidor,
} from "@/lib/preferencias";
import { avisarCopia } from "@/components/AvisoCopia";
import { CadastroPlantonistas } from "@/components/CadastroPlantonistas";
import { IconeCompartilhar, IconeEditar, IconeMais, IconeMenos } from "@/components/Icones";
import { BotaoDeLista, type OpcaoSeletor } from "@/components/Seletor";

/**
 * Divisão de plantão: de agora até as 07:00, em turnos iguais.
 *
 * O início nasce com a hora em que a tela abriu — é o "a partir de agora" do
 * plantão noturno — e pode ser corrigido, como o fim. Nomes são opcionais:
 * em branco vira PLANTONISTA 1, 2… O + de cada nome escolhe entre os
 * plantonistas cadastrados, os colegas de sempre, que moram nas preferências
 * na nuvem. A divisão em si não é guardada: fechou a tela, ela vai embora,
 * como qualquer outra coisa do plantão.
 *
 * A divisão só aparece ao apertar DIVIDIR, e some se algo mudar depois:
 * uma tabela que não bate com os campos acima é pior que tabela nenhuma.
 *
 * COMPARTILHAR manda a divisão como imagem — o cartão de TURNOS — para o
 * grupo do WhatsApp: no celular, pela folha de compartilhar do sistema; no
 * computador, copiando a imagem para colar (Ctrl V) no WhatsApp Web.
 */
export default function DivisaoPlantao() {
  // A hora só entra depois da hidratação: o HTML é gerado no build, e a hora
  // de lá não é a de quem abriu.
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState(FIM_PADRAO);
  const [nomes, setNomes] = useState<string[]>(["", "", ""]);
  const [divisao, setDivisao] = useState<Divisao | null>(null);
  const [erro, setErro] = useState("");
  /*
   * A imagem nasce junto com a divisão, e não no toque em COMPARTILHAR: o
   * Safari só abre a folha de compartilhar se ela for pedida no próprio
   * toque, e esperar o desenho ficar pronto consumia essa licença.
   */
  const [imagem, setImagem] = useState<File | null>(null);
  const vez = useRef(0);

  // Os cadastrados chegam com as preferências. Até lá o + fica apagado: um
  // cadastro que parece vazio só porque a nuvem ainda não respondeu levaria
  // a cadastrar de novo quem já está lá.
  const preferencias = useSyncExternalStore(inscreverPreferencias, preferenciasAtuais, preferenciasNoServidor);
  const cadastrados = useMemo(() => lerCadastrados(preferencias.plantonistas), [preferencias.plantonistas]);
  const [prefsProntas, setPrefsProntas] = useState(false);
  const [cadastroAberto, setCadastroAberto] = useState(false);

  useEffect(() => setInicio(horaAtual()), []);

  useEffect(() => {
    let vivo = true;
    void carregarPreferencias().then(() => vivo && setPrefsProntas(true));
    return () => {
      vivo = false;
    };
  }, []);

  /** Qualquer mudança invalida a divisão mostrada. */
  function mexeu() {
    vez.current++;
    setDivisao(null);
    setImagem(null);
    setErro("");
  }

  function mudarNome(i: number, nome: string) {
    setNomes((atual) => atual.map((x, j) => (j === i ? nome : x)));
    mexeu();
  }

  function mudarQuantidade(delta: number) {
    const n = Math.min(MAX_PLANTONISTAS, Math.max(MIN_PLANTONISTAS, nomes.length + delta));
    if (n === nomes.length) return;
    setNomes((atual) => (n > atual.length ? [...atual, ""] : atual.slice(0, n)));
    mexeu();
  }

  function dividir() {
    if (paraMinutos(inicio) === null || paraMinutos(fim) === null) {
      setErro("Confira as horas de início e de fim.");
      return;
    }
    const d = dividirPlantao(inicio, fim, nomes);
    if (!d) {
      setErro("Início e fim são a mesma hora: não há tempo para dividir.");
      return;
    }
    setDivisao(d);
    setImagem(null);
    const esta = ++vez.current;
    imagemDaDivisao(d)
      .then((f) => vez.current === esta && setImagem(f))
      .catch(() => {});
  }

  async function compartilhar() {
    if (!divisao) return;
    const celular = window.matchMedia("(pointer: coarse)").matches;
    const podeMandar = !!imagem && !!navigator.canShare?.({ files: [imagem] });

    // Celular: a folha do sistema, chamada antes de qualquer espera. Só o
    // arquivo — com título, o WhatsApp o punha de legenda embaixo da imagem.
    if (imagem && celular && podeMandar) {
      try {
        await navigator.share({ files: [imagem] });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // fechou a folha
      }
    }

    // Computador: a imagem vai para colar no WhatsApp Web.
    if (imagem && (await copiarImagem(imagem))) {
      avisarCopia("IMAGEM COPIADA · cole no WhatsApp", true);
      return;
    }

    // Sem imagem na área de transferência, o texto.
    avisarCopia("DIVISÃO DE PLANTÃO", await copiar(textoDaDivisao(divisao)));
  }

  const n = nomes.length;

  return (
    <div className="pagina">
      <header className="mb-4">
        <h1 className="titulo-pagina">DIVISÃO DE PLANTÃO</h1>
        <p className="subtitulo">
          Divide o tempo que resta até as 07:00 em turnos iguais entre os plantonistas.
        </p>
      </header>

      <div className="max-w-xl space-y-4">
        <section className="rounded-xl border border-edge bg-panel p-3 shadow-cartao">
          <h2 className="mb-2.5 rotulo">Horário</h2>
          {/* Lado a lado só com folga: o campo de hora do Chrome reserva o
              relógio e o AM/PM, e no painel de 240–268px cortava o "07:00". */}
          <div className="grid grid-cols-1 gap-3 min-[340px]:grid-cols-2">
            <label className="block min-w-0">
              <span className="mb-1 flex items-center justify-between gap-2">
                <span className="rotulo">Início</span>
                <button
                  type="button"
                  onClick={() => {
                    setInicio(horaAtual());
                    mexeu();
                  }}
                  className="text-[10px] font-semibold tracking-[0.07em] text-accent hover:underline"
                >
                  AGORA
                </button>
              </span>
              <input
                type="time"
                value={inicio}
                onChange={(e) => {
                  setInicio(e.target.value);
                  mexeu();
                }}
                className="campo campo-compacto tabular"
              />
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block rotulo">Fim</span>
              <input
                type="time"
                value={fim}
                onChange={(e) => {
                  setFim(e.target.value);
                  mexeu();
                }}
                className="campo campo-compacto tabular"
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-edge bg-panel p-3 shadow-cartao">
          {/*
            Abaixo de 260px o contador encolhe: com os botões de 32px ele
            passava da borda do cartão no painel de 240px. E, se nem assim
            couber, desce para a linha de baixo em vez de vazar.
          */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-2 min-[260px]:gap-x-3">
            <h2 className="rotulo">Plantonistas</h2>
            {/* Contador de pessoas: − 3 + */}
            <div className="ml-auto flex items-center gap-1 min-[260px]:gap-1.5">
              <button
                type="button"
                onClick={() => mudarQuantidade(-1)}
                disabled={n <= MIN_PLANTONISTAS}
                aria-label="Um plantonista a menos"
                className="botao botao-sm botao-icone botao-secundario max-[259px]:!h-7 max-[259px]:!w-7"
              >
                <IconeMenos tamanho={15} traco={2} />
              </button>
              <span aria-live="polite" className="tabular w-5 text-center text-[14px] font-semibold text-ink min-[260px]:w-7">
                {n}
              </span>
              <button
                type="button"
                onClick={() => mudarQuantidade(1)}
                disabled={n >= MAX_PLANTONISTAS}
                aria-label="Um plantonista a mais"
                className="botao botao-sm botao-icone botao-secundario max-[259px]:!h-7 max-[259px]:!w-7"
              >
                <IconeMais tamanho={15} traco={2} />
              </button>
            </div>
          </div>

          <ol className="space-y-2">
            {nomes.map((nome, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-panelHover text-[11px] font-semibold text-inkDim">
                  {i + 1}
                </span>
                <CampoDeNome
                  indice={i}
                  nomes={nomes}
                  cadastrados={cadastrados}
                  pronto={prefsProntas}
                  aoMudar={(v) => mudarNome(i, v)}
                  aoAbrirCadastro={() => setCadastroAberto(true)}
                />
              </li>
            ))}
          </ol>
          <p className="nota mt-2.5">
            Nome é opcional; o + escolhe entre os cadastrados. A ordem da lista é a ordem dos turnos.
          </p>
          {/* Curto de propósito: "PLANTONISTAS CADASTRADOS (3)" quebrava em
              duas linhas no painel de 240–268px. O nome inteiro está no
              título da janela que ele abre. */}
          <button
            type="button"
            onClick={() => setCadastroAberto(true)}
            disabled={!prefsProntas}
            className="mt-2 inline-flex items-center gap-1.5 whitespace-nowrap py-1 text-[10px] font-semibold tracking-[0.07em] text-accent hover:underline disabled:opacity-50 toque:py-2"
          >
            <IconeEditar tamanho={12} />
            {cadastrados.length ? "CADASTRADOS" : "CADASTRAR"}
            {cadastrados.length > 0 && <span className="tabular font-medium text-inkDim">({cadastrados.length})</span>}
          </button>
        </section>

        {erro && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">
            {erro}
          </p>
        )}

        <button onClick={dividir} disabled={!inicio} className="botao botao-primario w-full">
          DIVIDIR
        </button>

        {divisao && (
          <section
            aria-live="polite"
            className="surgir rounded-xl border border-accent/25 bg-panel p-3 shadow-cartao"
          >
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="rotulo text-accent">Turnos</h2>
              <span className="tabular text-[11px] text-inkDim">{resumoDaDivisao(divisao)}</span>
            </div>

            {/* Duas linhas por turno — nome em cima, horário embaixo — para o
                nome não sumir numa janela de 240px. */}
            <ol className="divide-y divide-edge overflow-hidden rounded-lg border border-edge bg-base/40">
              {divisao.turnos.map((t) => (
                <li key={t.ordem} className="flex items-start gap-3 px-3 py-2.5">
                  <span className="tabular mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
                    {t.ordem}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-ink">{t.nome}</p>
                    <p className="tabular mt-0.5 text-[13px] font-semibold text-ink">
                      {t.inicio} <span className="font-normal text-inkDim">às</span> {t.fim}{" "}
                      <span className="ml-0.5 text-[11px] font-medium text-inkDim">· {duracao(t.minutos)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <button onClick={() => void compartilhar()} className="botao botao-secundario mt-3 w-full sm:w-auto">
              <IconeCompartilhar tamanho={14} /> COMPARTILHAR
            </button>
          </section>
        )}
      </div>

      {cadastroAberto && (
        <CadastroPlantonistas
          cadastrados={cadastrados}
          sugestoes={foraDoCadastro(nomes, cadastrados)}
          aoMudar={(lista) => definirPreferencia("plantonistas", lista)}
          aoFechar={() => setCadastroAberto(false)}
        />
      )}
    </div>
  );
}

/** Valor da última linha da lista do +, que abre o cadastro em vez de escolher. */
const ABRIR_CADASTRO = "\u0000cadastro";

/**
 * O campo de um nome, com o + no canto direito: escolhe um dos cadastrados.
 *
 * Na lista, o nome que já está em outro turno leva o número dele — escolher
 * de novo pode ser engano, mas também pode ser de propósito (dois colegas
 * revezando em quatro turnos), então avisa em vez de esconder. Sem ninguém
 * cadastrado, o + abre direto o cadastro: uma lista vazia seria um passo a
 * mais para chegar no mesmo lugar.
 */
function CampoDeNome({
  indice,
  nomes,
  cadastrados,
  pronto,
  aoMudar,
  aoAbrirCadastro,
}: {
  indice: number;
  nomes: string[];
  cadastrados: string[];
  pronto: boolean;
  aoMudar: (nome: string) => void;
  aoAbrirCadastro: () => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const nome = nomes[indice];

  const opcoes: OpcaoSeletor[] = [
    ...cadastrados.map((c) => {
      const j = nomes.findIndex((n, k) => k !== indice && mesmoNome(n, c));
      return j < 0
        ? { valor: c, texto: c }
        : { valor: c, texto: c, selo: String(j + 1), seloDescricao: `já no turno ${j + 1}` };
    }),
    { valor: ABRIR_CADASTRO, texto: "Editar cadastrados…", separada: true },
  ];

  const classeDoMais =
    "transicao flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-inkDim hover:bg-panelHover hover:text-accent disabled:pointer-events-none disabled:opacity-40 aria-expanded:bg-panelHover aria-expanded:text-accent toque:h-7 toque:w-7";

  /*
   * A moldura é da caixa, e o campo e o + ficam lado a lado dentro dela —
   * não um por cima do outro. Assim o toque no canto direito é sempre do +
   * e o do texto é sempre do campo; e a lista abre com a largura da caixa.
   * O foco do campo acende a moldura inteira, como nos outros campos.
   */
  return (
    <div
      ref={caixa}
      className="campo campo-compacto relative flex min-w-0 flex-1 items-center gap-1 pr-1 has-[input:focus]:border-accent/80 has-[input:focus]:shadow-[0_0_0_2px_rgb(var(--accent)/0.16)]"
    >
      <input
        value={nome}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={nomeDoPlantonista("", indice)}
        aria-label={`Nome do plantonista ${indice + 1}`}
        autoComplete="off"
        spellCheck={false}
        className="foco-obvio h-full min-w-0 flex-1 bg-transparent uppercase outline-none placeholder:text-inkDim/50"
      />
      {cadastrados.length > 0 ? (
        <BotaoDeLista
          valor={cadastrados.find((c) => mesmoNome(c, nome)) ?? ""}
          opcoes={opcoes}
          aoEscolher={(v) => (v === ABRIR_CADASTRO ? aoAbrirCadastro() : aoMudar(v))}
          rotulo={`Escolher plantonista cadastrado para o turno ${indice + 1}`}
          ancora={caixa}
          disabled={!pronto}
          className={classeDoMais}
        >
          <IconeMais tamanho={14} traco={2} />
        </BotaoDeLista>
      ) : (
        <button
          type="button"
          onClick={aoAbrirCadastro}
          disabled={!pronto}
          aria-label="Cadastrar plantonistas"
          title="Cadastrar plantonistas"
          className={classeDoMais}
        >
          <IconeMais tamanho={14} traco={2} />
        </button>
      )}
    </div>
  );
}
