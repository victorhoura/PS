"use client";

import { useMemo, useState } from "react";
import { copiar } from "@/lib/clipboard";
import { avisarCopia } from "@/components/AvisoCopia";

type Modo = "maiusculas" | "minusculas" | "primeira";

/** Capitaliza a primeira letra de cada frase (porte de `_primeira_letra`). */
function primeiraLetra(s: string): string {
  let capitalizar = true;
  return [...s.toLowerCase()]
    .map((ch) => {
      let saida = ch;
      if (capitalizar && /\p{L}/u.test(ch)) {
        saida = ch.toUpperCase();
        capitalizar = false;
      }
      if (".!?".includes(ch)) capitalizar = true;
      return saida;
    })
    .join("");
}

const MODOS: { id: Modo; label: string }[] = [
  { id: "maiusculas", label: "MAIÚSCULAS" },
  { id: "minusculas", label: "minúsculas" },
  { id: "primeira", label: "Primeira letra" },
];

export default function ConversorLetras() {
  const [entrada, setEntrada] = useState("");
  const [modo, setModo] = useState<Modo>("maiusculas");

  const saida = useMemo(() => {
    if (modo === "maiusculas") return entrada.toUpperCase();
    if (modo === "minusculas") return entrada.toLowerCase();
    return primeiraLetra(entrada);
  }, [entrada, modo]);

  return (
    <div className="flex h-full flex-col p-4 lg:p-6">
      <header className="mb-4">
        <h1 className="font-mono text-lg font-bold tracking-widest text-ink">CONVERSOR DE LETRAS</h1>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {MODOS.map((m) => (
          <button
            key={m.id}
            onClick={() => setModo(m.id)}
            aria-pressed={modo === m.id}
            className={`transicao rounded border px-3 py-1.5 text-[11px] font-bold tracking-wide ${
              modo === m.id
                ? "border-accent bg-accent text-accentInk"
                : "border-edge bg-panel text-inkDim hover:bg-panelHover hover:text-ink"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <textarea
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          placeholder="Digite ou cole o texto…"
          autoFocus
          className="min-h-48 resize-none rounded border border-edge bg-panel px-3 py-2 text-[12px] leading-relaxed text-ink outline-none placeholder:text-inkDim/50 focus:border-accent"
        />
        <div className="flex min-h-48 flex-col">
          <output className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded border border-edge bg-panel px-3 py-2 text-[12px] leading-relaxed text-ink">
            {saida}
          </output>
          <div className="mt-2 flex gap-2">
            <button
              onClick={async () => avisarCopia("TEXTO", await copiar(saida))}
              disabled={!saida}
              className="transicao flex-1 rounded bg-accent px-4 py-2.5 text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110 disabled:opacity-30"
            >
              COPIAR
            </button>
            <button
              onClick={() => setEntrada("")}
              className="transicao rounded border border-edge bg-panel px-4 py-2.5 text-[12px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
            >
              LIMPAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
