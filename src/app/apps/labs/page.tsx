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
    <div className="pagina flex h-full flex-col">
      <header className="mb-4">
        <h1 className="titulo-pagina">FORMATADOR DE EXAMES</h1>
        <p className="subtitulo">
          Cole o laudo do SHIFT/AFIP. A linha compacta sai pronta para o prontuário.
        </p>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <div className="flex min-h-64 flex-col">
          <label htmlFor="bruto" className="mb-1.5 rotulo">
            LAUDO BRUTO
          </label>
          <textarea
            id="bruto"
            value={bruto}
            onChange={(e) => setBruto(e.target.value)}
            placeholder="Ctrl+V aqui…"
            autoFocus
            spellCheck={false}
            className="min-h-0 flex-1 resize-none rounded-xl border border-edge bg-panel px-3.5 py-2.5 shadow-cartao font-mono text-[11px] leading-relaxed text-ink outline-none placeholder:text-inkDim/50 focus:border-accent"
          />
        </div>

        <div className="flex min-h-48 flex-col">
          <label className="mb-1.5 rotulo">
            LINHA FORMATADA
          </label>
          <output className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-xl border border-edge bg-panel px-3.5 py-2.5 shadow-cartao font-mono text-[12px] leading-relaxed text-ink">
            {saida || (
              <span className="text-inkDim/60">
                Nada reconhecido ainda. Cole o laudo em LAUDO BRUTO.
              </span>
            )}
          </output>

          <div className="rodape-acoes mt-2.5">
            <button
              onClick={() => void copiarSaida()}
              disabled={!saida}
              className="botao botao-primario w-full sm:w-auto sm:px-5"
            >
              COPIAR
            </button>
            <button onClick={() => setBruto("")} className="botao botao-secundario w-full sm:w-auto">
              LIMPAR
            </button>
          </div>

          <p className="nota mt-3">
            Confira sempre a linha antes de colar no prontuário. O formatador lê o texto do
            laudo por padrão de escrita — se o laboratório mudar o layout, algum valor pode
            deixar de ser reconhecido.
          </p>
        </div>
      </div>
    </div>
  );
}
