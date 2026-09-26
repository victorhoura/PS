"use client";

import { useMemo, useState } from "react";
import {
  acharCalculadora,
  respostaInicial,
  somar,
  valorDaOpcao,
  valoresIniciais,
} from "@/lib/calculadoras";
import { copiar } from "@/lib/clipboard";
import { avisarCopia } from "./AvisoCopia";

/**
 * Desenha qualquer escore a partir da definição em `calculadoras.ts`.
 * Recalcula a cada clique — no original era preciso apertar CALCULAR, e dava
 * para copiar um resultado defasado em relação aos critérios marcados.
 */
export function Calculadora({ slug }: { slug: string }) {
  const calc = acharCalculadora(slug)!;
  const [resposta, setResposta] = useState(() => respostaInicial(calc));
  const [valores, setValores] = useState(() => valoresIniciais(calc));

  const pontos = useMemo(() => somar(calc, resposta), [calc, resposta]);
  const laudo = useMemo(
    () => calc.laudo(pontos, resposta, valores),
    [calc, pontos, resposta, valores],
  );
  const resumo = useMemo(
    () => calc.resumo(pontos, resposta, valores),
    [calc, pontos, resposta, valores],
  );

  function zerar() {
    setResposta(respostaInicial(calc));
    setValores(valoresIniciais(calc));
  }

  async function copiarLaudo() {
    const ok = await copiar(laudo);
    avisarCopia(calc.nome, ok);
  }

  /*
   * O título de cada bloco mora DENTRO do cartão, e não riscado na borda como
   * o <legend> desenha por padrão: flutuado, ele sai da moldura e vira a
   * primeira linha do cartão. O `clear` no que vem depois devolve o conteúdo
   * para baixo dele.
   */
  const cartao =
    "min-w-0 rounded-xl border border-edge bg-panel p-2 shadow-cartao [&>legend+*]:clear-both";
  const legenda = "float-left mb-1.5 w-full px-2 pt-1 rotulo";

  /** Linha de critério: a marcada ganha fundo, e dá para ler o escore de relance. */
  const opcao =
    "transicao flex cursor-pointer gap-2.5 rounded-lg px-2 py-[7px] text-ink/90 hover:bg-panelHover has-[:checked]:bg-accent/[0.08] has-[:checked]:text-ink toque:py-[11px]";

  return (
    <div className="pagina">
      <header className="mb-4">
        <h1 className="titulo-pagina">{calc.nome}</h1>
        <p className="subtitulo">{calc.subtitulo}</p>
      </header>

      {/*
        O resultado. Era o único texto do app acima da escala — 18px, maior
        que o próprio nome do escore — e por isso destoava em toda
        calculadora. O destaque aqui vem da cor e da moldura; o tamanho fica
        um passo abaixo do título, como em qualquer outra tela.

        Não é só estética: o resumo nem sempre é um número curto. Quando ele
        é uma instrução ("PREENCHA PESO E SÓDIO SÉRICO"), a 18px ele quebrava
        em duas linhas grandes num painel de 300px e tomava a tela.
      */}
      <div
        aria-live="polite"
        className="mb-4 flex items-start gap-2.5 rounded-xl border border-accent/25 bg-accent/[0.08] px-3 py-2.5"
      >
        <span aria-hidden className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-accent" />
        <span className="tabular min-w-0 break-words text-[13px] font-semibold leading-snug text-accent">
          {resumo}
        </span>
      </div>

      {/*
        grid-cols-1, e não a coluna implícita: esta nasce do tamanho mínimo do
        conteúdo, e um fieldset não encolhe abaixo do mínimo dele — o próprio
        navegador o define assim. Numa janela de 240px a legenda mais longa da
        cefaleia (ICHD-3) empurrava a tela para 299px, com rolagem de lado.
      */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
          {calc.campos?.length ? (
            <fieldset className={cartao}>
              <legend className={legenda}>DADOS DO PACIENTE</legend>
              <div className="grid gap-x-3 gap-y-2.5 px-1 pb-1 sm:grid-cols-2">
                {calc.campos.map((campo) => (
                  <label key={campo.id} className="block min-w-0">
                    <span className="mb-1 block break-words text-[11px] font-medium text-inkDim">
                      {campo.label}
                      {campo.unidade ? ` (${campo.unidade})` : ""}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={campo.passo ?? "any"}
                      // Vazio vira null, e não 0: peso 0 não existe, e o laudo
                      // precisa distinguir "não preenchido" de "zero".
                      value={valores[campo.id] ?? ""}
                      onChange={(e) =>
                        setValores((v) => ({
                          ...v,
                          [campo.id]: e.target.value === "" ? null : Number(e.target.value),
                        }))
                      }
                      className="campo tabular text-[13px] font-medium"
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {calc.grupos.map((g) => (
            <fieldset key={g.titulo} className={cartao}>
              <legend className={legenda}>{g.titulo}</legend>

              {g.criterios.map((c) =>
                c.opcoes ? (
                  <div key={c.id} className="space-y-px">
                    {c.opcoes.map((o) => (
                      <label
                        key={o.label}
                        className={`${opcao} items-center`}
                      >
                        <input
                          type="radio"
                          name={c.id}
                          checked={resposta[c.id] === valorDaOpcao(o)}
                          onChange={() => setResposta((r) => ({ ...r, [c.id]: valorDaOpcao(o) }))}
                          className="h-3.5 w-3.5 shrink-0 accent-accent"
                        />
                        <span className="min-w-0 break-words text-[12px] leading-snug">{o.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <label
                    key={c.id}
                    className={`${opcao} items-start`}
                  >
                    <input
                      type="checkbox"
                      checked={resposta[c.id] === 1}
                      onChange={(e) =>
                        setResposta((r) => ({ ...r, [c.id]: e.target.checked ? 1 : 0 }))
                      }
                      className="mt-px h-3.5 w-3.5 shrink-0 accent-accent"
                    />
                    <span className="min-w-0 flex-1 break-words text-[12px] leading-snug">{c.label}</span>
                    {/* Critério que não pontua — os da PERC, por exemplo — não
                        ganha selo: um "0" ao lado é ruído, não informação. */}
                    {c.pontos ? (
                      <span
                        className={`tabular shrink-0 rounded-full px-1.5 py-px text-[11px] font-semibold ${
                          c.pontos < 0 ? "bg-warn/10 text-warn" : "bg-panelHover text-inkDim"
                        }`}
                      >
                        {c.pontos > 0 ? `+${c.pontos}` : c.pontos}
                      </span>
                    ) : null}
                  </label>
                ),
              )}
            </fieldset>
          ))}

          <button
            onClick={zerar}
            className="botao botao-secundario w-full"
          >
            ZERAR
          </button>
        </div>

        <div className="flex min-w-0 flex-col">
          <pre className="min-h-48 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-edge bg-panel px-4 py-3.5 font-mono text-[11px] leading-relaxed text-ink shadow-cartao">
            {laudo}
          </pre>
          <button
            onClick={() => void copiarLaudo()}
            className="botao botao-primario mt-2.5 w-full"
          >
            COPIAR RESULTADO
          </button>
        </div>
      </div>
    </div>
  );
}
