"use client";

import { useMemo, useState } from "react";
import type { CategoriaSlug, Snippet } from "@/lib/types";
import { copiar, normalizar } from "@/lib/clipboard";
import { daCategoria } from "@/lib/repositorio";
import { useEstadoTextos, useTextos } from "@/hooks/useTextos";
import { avisarCopia } from "./AvisoCopia";
import { EditorTexto } from "./EditorTexto";
import { IconeBusca, IconeEditar, IconeMais, IconeSeta } from "./Icones";

/**
 * Lista de uma categoria. Mantém o gesto do app original — clicou, copiou —
 * e acrescenta o que o PS.py não tinha: criar e editar sem mexer no código.
 */
export function ListaSnippets({ slug, titulo }: { slug: CategoriaSlug; titulo: string }) {
  const lista = useTextos();
  const { estado } = useEstadoTextos();
  const carregando = estado === "carregando";
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
    <div className="p-3 sm:p-4 lg:px-7 lg:py-6">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h1 className="titulo-pagina">{titulo}</h1>
        <span className="tabular rounded-full bg-panelHover px-2 py-0.5 text-[11px] font-medium text-inkDim">
          {carregando ? "…" : `${filtrados.length}/${itens.length}`}
        </span>
      </header>

      {/*
        Filtro e "+" com 32px, a altura exata de uma linha da lista: a barra
        de cima não pode parecer maior que o conteúdo que ela filtra. Com
        36px, e o halo do foco em volta, ela ocupava o espaço de uma linha e
        meia no painel estreito.
      */}
      <div className="mb-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-inkDim/60">
            <IconeBusca tamanho={13} />
          </span>
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Filtrar nesta categoria…"
            aria-label={`Filtrar ${titulo}`}
            autoFocus
            className="h-8 w-full rounded-lg border border-edge bg-panel pl-8 pr-2.5 text-[12px] text-ink shadow-cartao outline-none transition-colors placeholder:text-inkDim/60"
          />
        </div>
        {/* Só o "+": o nome aparece ao parar o mouse em cima e é o que o
            leitor de tela anuncia. A largura que o "NOVO" ocupava volta
            para o filtro, que numa janela de 240px cortava o próprio aviso. */}
        <button
          onClick={() => setEditor("novo")}
          aria-label="Novo texto"
          title="Novo texto"
          className="transicao flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accentInk shadow-cartao hover:brightness-110"
        >
          <IconeMais tamanho={16} traco={2} />
        </button>
      </div>

      {carregando && <Carregando />}

      {!carregando && filtrados.length === 0 && (
        <p className="py-10 text-center text-xs text-inkDim">
          {itens.length === 0 ? "Categoria vazia. Crie o primeiro texto." : "Nada encontrado."}
        </p>
      )}

      {curto ? (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtrados.map((s) => (
            <div
              key={s.id}
              className="anel-dentro transicao group flex items-stretch overflow-hidden rounded-lg border border-edge bg-panel shadow-cartao hover:border-accent/50"
            >
              <button
                onClick={() => void copiarItem(s)}
                className="transicao flex min-w-0 flex-1 items-center justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-panelHover"
              >
                <span className="truncate text-[11.5px] font-semibold text-ink">{s.nome}</span>
                <span className="tabular shrink-0 font-mono text-[11px] font-medium text-accent">
                  {s.texto}
                </span>
              </button>
              <BotaoEditar aoClicar={() => setEditor(s)} nome={s.nome} />
            </div>
          ))}
        </div>
      ) : (
        /*
          Uma caixa só, com divisórias, em vez de um cartão com borda para
          cada texto: 110 fármacos eram 110 retângulos empilhados. Mesma
          altura de linha — o que muda é o ruído entre elas.
        */
        <ul
          className={`divide-y divide-edge overflow-hidden rounded-xl border border-edge bg-panel shadow-cartao ${
            filtrados.length === 0 ? "hidden" : ""
          }`}
        >
          {filtrados.map((s) => {
            const expandido = aberto === s.id;
            return (
              <li
                key={s.id}
                className={`anel-dentro transicao ${expandido ? "bg-accent/[0.05]" : ""}`}
              >
                <div className="flex items-stretch">
                  {/*
                    Só o nome, sem prévia do texto. A prévia custava uma
                    segunda linha em CADA item — numa categoria de 110
                    fármacos, isso é o dobro da lista para ler — e nunca
                    chegava à parte que importa: "REFERE DISFAGIA E FEBRE. NO
                    MOMENTO NEGA…" é o mesmo começo em quase todas as
                    anamneses. Quem quer o texto abre na seta.
                  */}
                  <button
                    onClick={() => void copiarItem(s)}
                    className="transicao flex min-w-0 flex-1 items-center px-3 py-[7px] text-left hover:bg-panelHover"
                  >
                    <span className={`truncate text-[12px] font-semibold ${expandido ? "text-accent" : "text-ink"}`}>
                      {s.nome}
                    </span>
                  </button>
                  <BotaoEditar aoClicar={() => setEditor(s)} nome={s.nome} />
                  <button
                    onClick={() => setAberto(expandido ? null : s.id)}
                    aria-expanded={expandido}
                    aria-label={expandido ? `Recolher ${s.nome}` : `Ver texto de ${s.nome}`}
                    className="transicao flex w-8 shrink-0 items-center justify-center text-inkDim hover:bg-panelHover hover:text-ink"
                  >
                    <IconeSeta aberto={expandido} tamanho={12} />
                  </button>
                </div>
                {expandido && (
                  <pre className="mx-3 mb-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-edge bg-base px-3 py-2.5 font-mono text-[11px] leading-relaxed text-ink/80">
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
 * O lugar da lista enquanto seus textos chegam da nuvem.
 *
 * Antes aqui aparecia a base do PS.py e, um instante depois, a sua versão —
 * com o texto que você criou surgindo e o que você apagou sumindo na sua
 * frente. Barras vazias não mostram nada que depois mude de ideia.
 */
function Carregando() {
  return (
    <div role="status" aria-label="Carregando seus textos">
      <p className="mb-2 text-[11px] text-inkDim">Carregando seus textos…</p>
      <ul
        className="divide-y divide-edge overflow-hidden rounded-xl border border-edge bg-panel shadow-cartao"
        aria-hidden="true"
      >
        {[72, 55, 64, 48, 60, 52].map((largura, i) => (
          <li key={i} className="flex h-[33px] items-center px-3">
            <span
              className="block h-2.5 rounded bg-edge motion-safe:animate-pulse"
              style={{ width: `${largura}%` }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function BotaoEditar({ aoClicar, nome }: { aoClicar: () => void; nome: string }) {
  return (
    <button
      onClick={aoClicar}
      aria-label={`Editar ${nome}`}
      title={`Editar ${nome}`}
      className="transicao flex w-8 shrink-0 items-center justify-center text-inkDim/70 hover:bg-panelHover hover:text-accent"
    >
      <IconeEditar tamanho={12} />
    </button>
  );
}
