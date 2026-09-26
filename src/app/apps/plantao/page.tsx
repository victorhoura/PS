"use client";

import { useEffect, useRef, useState } from "react";
import { copiar, copiarImagem } from "@/lib/clipboard";
import { imagemDaDivisao, resumoDaDivisao } from "@/lib/imagemPlantao";
import {
  FIM_PADRAO,
  MAX_PLANTONISTAS,
  MIN_PLANTONISTAS,
  dividirPlantao,
  duracao,
  horaAtual,
  nomeDoPlantonista,
  paraMinutos,
  textoDaDivisao,
  type Divisao,
} from "@/lib/plantao";
import { avisarCopia } from "@/components/AvisoCopia";
import { IconeCompartilhar, IconeMais, IconeMenos } from "@/components/Icones";

/**
 * Divisão de plantão: de agora até as 07:00, em turnos iguais.
 *
 * O início nasce com a hora em que a tela abriu — é o "a partir de agora" do
 * plantão noturno — e pode ser corrigido, como o fim. Nomes são opcionais:
 * em branco vira PLANTONISTA 1, 2… Nada disso é guardado; fechou a tela, a
 * divisão vai embora, como qualquer outra coisa do plantão.
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

  useEffect(() => setInicio(horaAtual()), []);

  /** Qualquer mudança invalida a divisão mostrada. */
  function mexeu() {
    vez.current++;
    setDivisao(null);
    setImagem(null);
    setErro("");
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
        <section className="rounded-xl border border-edge bg-panel p-4 shadow-cartao">
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
                className="campo tabular text-[13px] font-medium"
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
                className="campo tabular text-[13px] font-medium"
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-edge bg-panel p-4 shadow-cartao">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="rotulo">Plantonistas</h2>
            {/* Contador de pessoas: − 3 + */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => mudarQuantidade(-1)}
                disabled={n <= MIN_PLANTONISTAS}
                aria-label="Um plantonista a menos"
                className="botao botao-sm botao-icone botao-secundario"
              >
                <IconeMenos tamanho={15} traco={2} />
              </button>
              <span aria-live="polite" className="tabular w-7 text-center text-[14px] font-semibold text-ink">
                {n}
              </span>
              <button
                type="button"
                onClick={() => mudarQuantidade(1)}
                disabled={n >= MAX_PLANTONISTAS}
                aria-label="Um plantonista a mais"
                className="botao botao-sm botao-icone botao-secundario"
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
                <input
                  value={nome}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNomes((atual) => atual.map((x, j) => (j === i ? v : x)));
                    mexeu();
                  }}
                  placeholder={nomeDoPlantonista("", i)}
                  aria-label={`Nome do plantonista ${i + 1}`}
                  autoComplete="off"
                  spellCheck={false}
                  className="campo uppercase"
                />
              </li>
            ))}
          </ol>
          <p className="nota mt-2.5">
            Nome é opcional. A ordem da lista é a ordem dos turnos: o 1 fica com o primeiro.
          </p>
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
            className="surgir rounded-xl border border-accent/25 bg-panel p-4 shadow-cartao"
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
    </div>
  );
}
