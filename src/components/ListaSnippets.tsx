"use client";

import { useMemo, useState } from "react";
import type { Snippet } from "@/lib/types";
import { copiar, normalizar } from "@/lib/clipboard";
import { avisarCopia } from "./AvisoCopia";

/**
 * Lista de uma categoria. Mantém o gesto do app original — clicou, copiou —
 * mas mostra o texto ao lado, porque copiar às cegas é como o original errava:
 * não dava para conferir o que ia para o prontuário.
 */
export function ListaSnippets({ titulo, itens }: { titulo: string; itens: Snippet[] }) {
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const t = normalizar(termo.trim());
    if (!t) return itens;
    return itens.filter(
      (i) => normalizar(i.nome).includes(t) || normalizar(i.texto).includes(t),
    );
  }, [itens, termo]);

  async function copiarItem(s: Snippet) {
    const ok = await copiar(s.texto);
    avisarCopia(s.nome, ok);
  }

  // Texto de uma linha só (CID) fica melhor em grade densa que em lista.
  const curto = itens.every((i) => i.texto.length <= 12);

  return (
    <div className="p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-mono text-lg font-bold tracking-widest text-ink">{titulo}</h1>
        <span className="font-mono text-[11px] text-inkDim">
          {filtrados.length}/{itens.length}
        </span>
      </header>

      <input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Filtrar nesta categoria…"
        aria-label={`Filtrar ${titulo}`}
        autoFocus
        className="mb-4 w-full rounded border border-edge bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-inkDim/60 focus:border-accent"
      />

      {filtrados.length === 0 && (
        <p className="py-8 text-center text-xs text-inkDim">Nada encontrado.</p>
      )}

      {curto ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtrados.map((s) => (
            <button
              key={s.id}
              onClick={() => void copiarItem(s)}
              className="transicao flex items-center justify-between gap-2 rounded border border-edge bg-panel px-3 py-2 text-left hover:border-accent hover:bg-panelHover"
            >
              <span className="truncate text-[11px] font-semibold text-ink">{s.nome}</span>
              <span className="shrink-0 font-mono text-[11px] text-accent">{s.texto}</span>
            </button>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtrados.map((s) => {
            const expandido = aberto === s.id;
            return (
              <li key={s.id} className="overflow-hidden rounded border border-edge bg-panel">
                <div className="flex items-stretch">
                  <button
                    onClick={() => void copiarItem(s)}
                    className="transicao min-w-0 flex-1 px-3 py-2.5 text-left hover:bg-panelHover"
                  >
                    <span className="block text-[12px] font-bold tracking-wide text-ink">{s.nome}</span>
                    {!expandido && (
                      <span className="mt-0.5 block truncate text-[11px] text-inkDim">
                        {s.texto.replace(/\s+/g, " ").slice(0, 120)}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setAberto(expandido ? null : s.id)}
                    aria-expanded={expandido}
                    aria-label={expandido ? `Recolher ${s.nome}` : `Ver texto de ${s.nome}`}
                    className="transicao shrink-0 border-l border-edge px-3 font-mono text-[10px] text-inkDim hover:bg-panelHover hover:text-ink"
                  >
                    {expandido ? "▲" : "▼"}
                  </button>
                </div>
                {expandido && (
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-t border-edge bg-base px-3 py-2 font-mono text-[11px] leading-relaxed text-inkDim">
                    {s.texto}
                  </pre>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
