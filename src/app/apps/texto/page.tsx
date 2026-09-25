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

/**
 * `curto` é o que aparece em janela muito estreita (abaixo de 360px): os três
 * nomes inteiros não cabem numa linha ali, e quebrando em duas o seletor
 * ficava torto. A amostra diz o mesmo — é o próprio resultado em miniatura.
 */
const MODOS: { id: Modo; label: string; curto: string }[] = [
  { id: "maiusculas", label: "MAIÚSCULAS", curto: "ABC" },
  { id: "minusculas", label: "minúsculas", curto: "abc" },
  { id: "primeira", label: "Primeira letra", curto: "Abc" },
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
    <div className="pagina flex h-full flex-col">
      <header className="mb-4">
        <h1 className="titulo-pagina">CONVERSOR DE LETRAS</h1>
      </header>

      <div className="segmentado mb-4 flex w-full sm:inline-flex sm:w-auto">
        {MODOS.map((m) => (
          <button
            key={m.id}
            onClick={() => setModo(m.id)}
            aria-pressed={modo === m.id}
            aria-label={m.label}
            title={m.label}
            className="segmento flex-1 normal-case sm:flex-none"
          >
            <span className="min-[360px]:hidden">{m.curto}</span>
            <span className="hidden min-[360px]:inline">{m.label}</span>
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <textarea
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          placeholder="Digite ou cole o texto…"
          autoFocus
          className="min-h-48 resize-none rounded-xl border border-edge bg-panel px-3.5 py-2.5 shadow-cartao text-[12px] leading-relaxed text-ink outline-none placeholder:text-inkDim/50 focus:border-accent"
        />
        <div className="flex min-h-48 flex-col">
          <output className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-xl border border-edge bg-panel px-3.5 py-2.5 shadow-cartao text-[12px] leading-relaxed text-ink">
            {saida}
          </output>
          <div className="rodape-acoes mt-2.5">
            <button
              onClick={async () => avisarCopia("TEXTO", await copiar(saida))}
              disabled={!saida}
              className="botao botao-primario w-full sm:w-auto sm:px-5"
            >
              COPIAR
            </button>
            <button onClick={() => setEntrada("")} className="botao botao-secundario w-full sm:w-auto">
              LIMPAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
