"use client";

import { useMemo, useState } from "react";
import { Secao } from "@/components/Cartao";
import { Cofre } from "@/components/Cofre";
import { EditorLink } from "@/components/EditorLink";
import { avisarCopia } from "@/components/AvisoCopia";
import { IconeEditar, IconeMais, IconeSeta } from "@/components/Icones";
import { useLinks } from "@/hooks/useLinks";
import { type Link, porGrupo } from "@/lib/links";

export default function Links() {
  const links = useLinks();
  /** null = fechado; "novo" = criando; Link = editando aquele. */
  const [editor, setEditor] = useState<Link | "novo" | null>(null);
  /** Qual link está com o endereço à mostra. Um de cada vez. */
  const [expandido, setExpandido] = useState<string | null>(null);

  const grupos = useMemo(() => porGrupo(links), [links]);
  const nomesDeGrupo = useMemo(() => grupos.map(([g]) => g), [grupos]);

  function fechar(mensagem?: string) {
    setEditor(null);
    if (mensagem) avisarCopia(mensagem, true);
  }

  return (
    <div className="p-3 sm:p-4 lg:px-7 lg:py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="titulo-pagina">LINKS</h1>
        <button
          onClick={() => setEditor("novo")}
          aria-label="Novo link"
          title="Novo link"
          className="transicao flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accentInk shadow-cartao hover:brightness-110"
        >
          <IconeMais tamanho={18} traco={2} />
        </button>
      </header>

      {links.length === 0 && (
        <p className="py-8 text-center text-xs text-inkDim">
          Nenhum link. Use o + para acrescentar o primeiro.
        </p>
      )}

      {grupos.map(([nome, itens]) => (
        <Secao key={nome} titulo={nome}>
          {/*
            `items-start` porque um cartão pode abrir: sem isso a célula
            vizinha da mesma linha da grade esticaria junto, sem ter o que
            mostrar no espaço que ganhou.
          */}
          <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-2">
            {itens.map((l) => {
              const aberto = expandido === l.id;
              return (
                <div
                  key={l.id}
                  className={`anel-dentro transicao overflow-hidden rounded-xl border bg-panel shadow-cartao ${
                    aberto ? "border-accent/50" : "border-edge hover:border-accent/40"
                  }`}
                >
                  <div className="flex items-stretch">
                    {/*
                      O link e os botões são irmãos, e não um dentro do outro:
                      um <button> dentro de um <a> não é HTML válido, e o
                      clique acabaria abrindo o site em vez de editar.

                      Só o nome na linha, como nas listas de texto. O endereço
                      desceu para a seta: ele importa na hora de conferir se o
                      link leva ao sistema certo, e não a cada vez que você
                      passa os olhos pela lista.
                    */}
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transicao flex min-w-0 flex-1 items-center px-3 py-2 hover:bg-panelHover"
                    >
                      <span className="truncate text-[12.5px] font-semibold text-ink">
                        {l.nome}
                      </span>
                    </a>
                    <button
                      onClick={() => setEditor(l)}
                      aria-label={`Editar ${l.nome}`}
                      title={`Editar ${l.nome}`}
                      className="transicao flex w-8 shrink-0 items-center justify-center text-inkDim/70 hover:bg-panelHover hover:text-accent"
                    >
                      <IconeEditar tamanho={12} />
                    </button>
                    <button
                      onClick={() => setExpandido(aberto ? null : l.id)}
                      aria-expanded={aberto}
                      aria-label={aberto ? `Recolher ${l.nome}` : `Ver endereço de ${l.nome}`}
                      className="transicao flex w-8 shrink-0 items-center justify-center text-inkDim hover:bg-panelHover hover:text-ink"
                    >
                      <IconeSeta aberto={aberto} tamanho={12} />
                    </button>
                  </div>
                  {aberto && (
                    <p className="mx-3 mb-3 select-all break-all rounded-lg border border-edge bg-base px-3 py-2 font-mono text-[11px] leading-relaxed text-inkDim">
                      {l.url}
                    </p>
                  )}
                </div>
              );
            })}
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
