"use client";

import { useMemo, useState } from "react";
import type { CategoriaSlug, Snippet } from "@/lib/types";
import { copiar, normalizar } from "@/lib/clipboard";
import { daCategoria, ehNovo } from "@/lib/repositorio";
import { useTextos } from "@/hooks/useTextos";
import { avisarCopia } from "./AvisoCopia";
import { EditorTexto } from "./EditorTexto";
import { IconeBusca, IconeEditar, IconeMais, IconeSeta } from "./Icones";

/**
 * Lista de uma categoria. Mantém o gesto do app original — clicou, copiou —
 * e acrescenta o que o PS.py não tinha: criar e editar sem mexer no código.
 */
export function ListaSnippets({ slug, titulo }: { slug: CategoriaSlug; titulo: string }) {
  const lista = useTextos();
  const itens = useMemo(() => daCategoria(slug, lista), [slug, lista]);

  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  /** null = fechado; "novo" = criando; Snippet = editando aquele. */
  const [editor, setEditor] = useState<Snippet | "novo" | null>(null);

  const filtrados = useMemo(() => {
    const t = normalizar(termo.trim());
    if (!t) return itens;
    return itens.filter(
      (i) => normalizar(i.nome).includes(t) || normalizar(i.texto).includes(t),
    );
  }, [itens, termo]);

  async function copiarItem(s: Snippet) {
    avisarCopia(s.nome, await copiar(s.texto));
  }

  function fecharEditor(mensagem?: string) {
    setEditor(null);
    if (mensagem) avisarCopia(mensagem, true);
  }

  // Texto de uma linha só (CID) vai em grade densa — mas só a partir de
  // 640px. Em janela estreita duas colunas truncam o nome, e
  // "CONJUNTI…" não distingue alérgica de bacteriana de viral.
  const curto = itens.length > 0 && itens.every((i) => i.texto.length <= 12);

  return (
    <div className="p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h1 className="font-mono text-base font-bold tracking-[0.16em] text-ink">{titulo}</h1>
        <span className="tabular font-mono text-[11px] text-inkDim">
          {filtrados.length}/{itens.length}
        </span>
      </header>

      <div className="mb-4 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-inkDim/60">
            <IconeBusca tamanho={14} />
          </span>
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Filtrar nesta categoria…"
            aria-label={`Filtrar ${titulo}`}
            autoFocus
            className="h-9 w-full rounded-lg border border-edge bg-panel pl-9 pr-3 text-[13px] text-ink outline-none transition-colors placeholder:text-inkDim/60 focus:border-accent"
          />
        </div>
        <button
          onClick={() => setEditor("novo")}
          className="transicao flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[11px] font-bold tracking-wide text-accentInk hover:brightness-110"
        >
          <IconeMais tamanho={14} />
          NOVO
        </button>
      </div>

      {filtrados.length === 0 && (
        <p className="py-10 text-center text-xs text-inkDim">
          {itens.length === 0 ? "Categoria vazia. Crie o primeiro texto." : "Nada encontrado."}
        </p>
      )}

      {curto ? (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtrados.map((s) => (
            <div
              key={s.id}
              className="transicao group flex items-stretch overflow-hidden rounded-lg border border-edge bg-panel hover:border-accent/60"
            >
              <button
                onClick={() => void copiarItem(s)}
                className="transicao flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left hover:bg-panelHover"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <Marca snippet={s} />
                  <span className="truncate text-[11px] font-semibold text-ink">{s.nome}</span>
                </span>
                <span className="tabular shrink-0 font-mono text-[11px] text-accent">
                  {s.texto}
                </span>
              </button>
              <BotaoEditar aoClicar={() => setEditor(s)} nome={s.nome} />
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {filtrados.map((s) => {
            const expandido = aberto === s.id;
            return (
              <li
                key={s.id}
                className={`transicao overflow-hidden rounded-lg border bg-panel ${
                  expandido ? "border-accent/60" : "border-edge hover:border-accent/40"
                }`}
              >
                <div className="flex items-stretch">
                  <button
                    onClick={() => void copiarItem(s)}
                    className="transicao min-w-0 flex-1 px-3 py-2.5 text-left hover:bg-panelHover"
                  >
                    <span className="flex items-center gap-1.5">
                      <Marca snippet={s} />
                      <span className="text-[12px] font-bold tracking-wide text-ink">
                        {s.nome}
                      </span>
                    </span>
                    {!expandido && (
                      <span className="mt-0.5 block truncate text-[11px] text-inkDim">
                        {s.texto.replace(/\s+/g, " ").slice(0, 120)}
                      </span>
                    )}
                  </button>
                  <BotaoEditar aoClicar={() => setEditor(s)} nome={s.nome} />
                  <button
                    onClick={() => setAberto(expandido ? null : s.id)}
                    aria-expanded={expandido}
                    aria-label={expandido ? `Recolher ${s.nome}` : `Ver texto de ${s.nome}`}
                    className="transicao flex w-10 shrink-0 items-center justify-center border-l border-edge text-inkDim hover:bg-panelHover hover:text-ink"
                  >
                    <IconeSeta aberto={expandido} tamanho={14} />
                  </button>
                </div>
                {expandido && (
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-t border-edge bg-base px-3 py-2.5 font-mono text-[11px] leading-relaxed text-inkDim">
                    {s.texto}
                  </pre>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editor !== null && (
        <EditorTexto
          categoria={slug}
          alvo={editor === "novo" ? null : editor}
          aoFechar={fecharEditor}
        />
      )}
    </div>
  );
}

/**
 * Ponto que distingue texto seu (accent) de original editado (warn).
 * Lê do próprio snippet — `atualizadoEm` só existe no que você mexeu — e não
 * do localStorage, que durante a hidratação divergiria do HTML do servidor.
 */
function Marca({ snippet }: { snippet: Snippet }) {
  const { id, atualizadoEm } = snippet;

  if (ehNovo(id)) {
    return (
      <span
        title="Texto seu"
        aria-label="Texto seu"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
      />
    );
  }
  if (atualizadoEm) {
    return (
      <span
        title="Original editado por você"
        aria-label="Original editado por você"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn"
      />
    );
  }
  return null;
}

function BotaoEditar({ aoClicar, nome }: { aoClicar: () => void; nome: string }) {
  return (
    <button
      onClick={aoClicar}
      aria-label={`Editar ${nome}`}
      title={`Editar ${nome}`}
      className="transicao flex w-10 shrink-0 items-center justify-center border-l border-edge text-inkDim hover:bg-panelHover hover:text-accent"
    >
      <IconeEditar tamanho={14} />
    </button>
  );
}
