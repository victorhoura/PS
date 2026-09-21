"use client";

import { useMemo, useState } from "react";
import { acharCalculadora, respostaInicial, somar, valoresIniciais } from "@/lib/calculadoras";
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

  return (
    <div className="p-3 lg:p-4">
      <header className="mb-4">
        <h1 className="font-mono text-base font-bold tracking-[0.16em] text-ink">{calc.nome}</h1>
        <p className="mt-0.5 text-[11px] text-inkDim">{calc.subtitulo}</p>
      </header>

      <div
        aria-live="polite"
        className="mb-3 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2"
      >
        <span className="font-mono text-lg font-bold leading-snug text-accent">{resumo}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {calc.campos?.length ? (
            <fieldset className="rounded-lg border border-edge bg-panel p-3">
              <legend className="px-1 font-mono text-[10px] font-bold tracking-widest text-inkDim">
                DADOS DO PACIENTE
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {calc.campos.map((campo) => (
                  <label key={campo.id} className="block px-2 py-1">
                    <span className="mb-0.5 block font-mono text-[10px] tracking-widest text-inkDim">
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
                      className="w-full rounded-md border border-edge bg-base px-2.5 py-1 font-mono text-[13px] text-ink outline-none focus:border-accent"
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {calc.grupos.map((g) => (
            <fieldset key={g.titulo} className="rounded-lg border border-edge bg-panel p-3">
              <legend className="px-1 font-mono text-[10px] font-bold tracking-widest text-inkDim">
                {g.titulo}
              </legend>

              {g.criterios.map((c) =>
                c.opcoes ? (
                  <div key={c.id} className="space-y-1">
                    {c.opcoes.map((o) => (
                      <label
                        key={o.label}
                        className="transicao flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-panelHover"
                      >
                        <input
                          type="radio"
                          name={c.id}
                          checked={resposta[c.id] === o.pontos}
                          onChange={() => setResposta((r) => ({ ...r, [c.id]: o.pontos }))}
                          className="h-3.5 w-3.5 shrink-0 accent-[#2fb5d9]"
                        />
                        <span className="text-[11px] leading-snug text-ink">{o.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <label
                    key={c.id}
                    className="transicao flex cursor-pointer items-start gap-2.5 rounded px-2 py-1.5 hover:bg-panelHover"
                  >
                    <input
                      type="checkbox"
                      checked={resposta[c.id] === 1}
                      onChange={(e) =>
                        setResposta((r) => ({ ...r, [c.id]: e.target.checked ? 1 : 0 }))
                      }
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#2fb5d9]"
                    />
                    <span className="flex-1 text-[11px] leading-snug text-ink">{c.label}</span>
                    {/* Critério que não pontua — os da PERC, por exemplo — não
                        ganha selo: um "0" ao lado é ruído, não informação. */}
                    {c.pontos ? (
                      <span
                        className={`shrink-0 font-mono text-[10px] ${
                          c.pontos < 0 ? "text-warn" : "text-inkDim"
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
            className="transicao w-full rounded-lg border border-edge bg-panel px-4 py-2 text-[11px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
          >
            ZERAR
          </button>
        </div>

        <div className="flex flex-col">
          <pre className="min-h-48 flex-1 overflow-auto whitespace-pre-wrap rounded-lg border border-edge bg-panel px-3 py-3 font-mono text-[11px] leading-relaxed text-ink">
            {laudo}
          </pre>
          <button
            onClick={() => void copiarLaudo()}
            className="transicao mt-2 w-full rounded-lg bg-accent px-4 py-2 text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110"
          >
            COPIAR RESULTADO
          </button>
        </div>
      </div>
    </div>
  );
}
