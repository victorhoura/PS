"use client";

import { useMemo, useState } from "react";
import { formatarLabs } from "@/lib/labs";
import { copiar } from "@/lib/clipboard";
import { avisarCopia } from "@/components/AvisoCopia";

export default function FormatadorLabs() {
  const [bruto, setBruto] = useState("");
  const saida = useMemo(() => formatarLabs(bruto), [bruto]);

  async function copiarSaida() {
    const ok = await copiar(saida);
    avisarCopia("LABS", ok);
  }

  return (
    <div className="flex h-full flex-col p-3 lg:p-4">
      <header className="mb-4">
        <h1 className="font-mono text-base font-bold tracking-[0.16em] text-ink">FORMATADOR DE EXAMES</h1>
        <p className="mt-0.5 text-[11px] text-inkDim">
          Cole o laudo do SHIFT/AFIP. A linha compacta sai pronta para o prontuário.
        </p>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <div className="flex min-h-64 flex-col">
          <label htmlFor="bruto" className="mb-1.5 font-mono text-[10px] font-bold tracking-widest text-inkDim">
            LAUDO BRUTO
          </label>
          <textarea
            id="bruto"
            value={bruto}
            onChange={(e) => setBruto(e.target.value)}
            placeholder="Ctrl+V aqui…"
            autoFocus
            spellCheck={false}
            className="min-h-0 flex-1 resize-none rounded-lg border border-edge bg-panel px-3 py-2 font-mono text-[11px] leading-relaxed text-ink outline-none placeholder:text-inkDim/50 focus:border-accent"
          />
        </div>

        <div className="flex min-h-48 flex-col">
          <label className="mb-1.5 font-mono text-[10px] font-bold tracking-widest text-inkDim">
            LINHA FORMATADA
          </label>
          <output className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-lg border border-edge bg-panel px-3 py-2 font-mono text-[12px] leading-relaxed text-ink">
            {saida || (
              <span className="text-inkDim/60">
                Nada reconhecido ainda. Cole o laudo em LAUDO BRUTO.
              </span>
            )}
          </output>

          <div className="mt-2 flex gap-2">
            <button
              onClick={() => void copiarSaida()}
              disabled={!saida}
              className="transicao flex-1 rounded-lg bg-accent px-4 py-2 text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
            >
              COPIAR
            </button>
            <button
              onClick={() => setBruto("")}
              className="transicao rounded-lg border border-edge bg-panel px-4 py-2 text-[12px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
            >
              LIMPAR
            </button>
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-inkDim">
            Confira sempre a linha antes de colar no prontuário. O formatador lê o texto do
            laudo por padrão de escrita — se o laboratório mudar o layout, algum valor pode
            deixar de ser reconhecido.
          </p>
        </div>
      </div>
    </div>
  );
}
