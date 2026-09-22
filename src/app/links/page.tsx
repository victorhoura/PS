"use client";

import { useMemo, useState } from "react";
import { Secao } from "@/components/Cartao";
import { Cofre } from "@/components/Cofre";
import { EditorLink } from "@/components/EditorLink";
import { avisarCopia } from "@/components/AvisoCopia";
import { IconeEditar, IconeMais } from "@/components/Icones";
import { useLinks } from "@/hooks/useLinks";
import { hostDe, type Link, porGrupo } from "@/lib/links";

export default function Links() {
  const links = useLinks();
  /** null = fechado; "novo" = criando; Link = editando aquele. */
  const [editor, setEditor] = useState<Link | "novo" | null>(null);

  const grupos = useMemo(() => porGrupo(links), [links]);
  const nomesDeGrupo = useMemo(() => grupos.map(([g]) => g), [grupos]);

  function fechar(mensagem?: string) {
    setEditor(null);
    if (mensagem) avisarCopia(mensagem, true);
  }

  return (
    <div className="p-3 lg:p-4">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-mono text-base font-bold tracking-[0.16em] text-ink">LINKS</h1>
        <button
          onClick={() => setEditor("novo")}
          className="transicao flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[11px] font-bold tracking-wide text-accentInk hover:brightness-110"
        >
          <IconeMais tamanho={14} />
          NOVO
        </button>
      </header>

      {links.length === 0 && (
        <p className="py-8 text-center text-xs text-inkDim">
          Nenhum link. Use NOVO para acrescentar o primeiro.
        </p>
      )}

      {grupos.map(([nome, itens]) => (
        <Secao key={nome} titulo={nome}>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {itens.map((l) => (
              <div
                key={l.id}
                className="transicao group flex items-stretch overflow-hidden rounded-lg border border-edge bg-panel hover:border-accent/60"
              >
                {/*
                  O link e o botão de editar são irmãos, e não um dentro do
                  outro: um <button> dentro de um <a> não é HTML válido, e o
                  clique acabaria abrindo o site em vez de editar.
                */}
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transicao min-w-0 flex-1 px-2.5 py-1.5 hover:bg-panelHover"
                >
                  <span className="block truncate text-[12px] font-bold tracking-wide text-ink">
                    {l.nome}
                  </span>
                  {/* O endereço fica: numa máquina do hospital, é o que diz se
                      o link leva ao sistema certo antes de você digitar a
                      senha nele. */}
                  <span className="mt-0.5 block truncate font-mono text-[10px] leading-snug text-inkDim">
                    {hostDe(l.url)}
                  </span>
                </a>
                <button
                  onClick={() => setEditor(l)}
                  aria-label={`Editar ${l.nome}`}
                  title={`Editar ${l.nome}`}
                  className="transicao flex w-8 shrink-0 items-center justify-center border-l border-edge text-inkDim hover:bg-panelHover hover:text-accent"
                >
                  <IconeEditar tamanho={12} />
                </button>
              </div>
            ))}
          </div>
        </Secao>
      ))}

      <Cofre />

      {editor !== null && (
        <EditorLink
          alvo={editor === "novo" ? null : editor}
          grupos={nomesDeGrupo}
          aoFechar={fechar}
        />
      )}
    </div>
  );
}
