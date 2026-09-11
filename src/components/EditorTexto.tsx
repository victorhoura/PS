"use client";

import { useEffect, useRef, useState } from "react";
import type { CategoriaSlug, Snippet } from "@/lib/types";
import { criar, editar, ehNovo, foiEditado, remover, restaurar } from "@/lib/repositorio";

/**
 * Criar e editar um texto. Mesmo formulário para os dois casos: `alvo` nulo
 * significa criar na categoria aberta.
 */
export function EditorTexto({
  categoria,
  alvo,
  aoFechar,
}: {
  categoria: CategoriaSlug;
  alvo: Snippet | null;
  aoFechar: (mensagem?: string) => void;
}) {
  const criando = alvo === null;
  const [nome, setNome] = useState(alvo?.nome ?? "");
  const [texto, setTexto] = useState(alvo?.texto ?? "");
  const [erro, setErro] = useState("");
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const nomeRef = useRef<HTMLInputElement>(null);

  const editado = alvo ? foiEditado(alvo.id) : false;
  const proprio = alvo ? ehNovo(alvo.id) : true;

  useEffect(() => {
    nomeRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        aoFechar();
      }
      // Ctrl+Enter salva sem tirar a mão do teclado.
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        salvar();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  function salvar() {
    if (!nome.trim()) {
      setErro("Dê um nome ao texto.");
      nomeRef.current?.focus();
      return;
    }
    if (!texto.trim()) {
      setErro("O texto está vazio.");
      return;
    }

    const ok = criando ? criar(categoria, nome, texto) : editar(alvo.id, nome, texto);
    aoFechar(
      ok
        ? criando
          ? "Texto criado."
          : "Texto salvo."
        : "Salvo só nesta sessão: o navegador recusou gravar.",
    );
  }

  function apagar() {
    if (!alvo) return;
    const ok = remover(alvo.id);
    aoFechar(ok ? (proprio ? "Texto apagado." : "Texto do original escondido.") : "Não foi possível apagar.");
  }

  function voltarAoOriginal() {
    if (!alvo) return;
    restaurar(alvo.id);
    aoFechar("Texto original restaurado.");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[6vh]"
      onClick={() => aoFechar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={criando ? "Criar texto" : "Editar texto"}
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-edge bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-edge px-4 py-2.5">
          <h2 className="font-mono text-[11px] font-bold tracking-widest text-ink">
            {criando ? "NOVO TEXTO" : "EDITAR TEXTO"}
          </h2>
          {!criando && !proprio && (
            <span className="font-mono text-[10px] text-inkDim">
              {editado ? "original editado" : "original do PS.py"}
            </span>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <label htmlFor="ed-nome" className="mb-1.5 block font-mono text-[10px] font-bold tracking-widest text-inkDim">
            NOME
          </label>
          <input
            id="ed-nome"
            ref={nomeRef}
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setErro("");
            }}
            placeholder="Ex.: AMIGDALITE"
            className="mb-4 w-full rounded border border-edge bg-base px-3 py-2 text-[12px] font-bold tracking-wide text-ink outline-none placeholder:text-inkDim/50 focus:border-accent"
          />

          <label htmlFor="ed-texto" className="mb-1.5 block font-mono text-[10px] font-bold tracking-widest text-inkDim">
            TEXTO
          </label>
          <textarea
            id="ed-texto"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setErro("");
            }}
            rows={14}
            spellCheck={false}
            placeholder="O texto que vai para a área de transferência…"
            className="w-full resize-y rounded border border-edge bg-base px-3 py-2 font-mono text-[11px] leading-relaxed text-ink outline-none placeholder:text-inkDim/50 focus:border-accent"
          />

          {erro && (
            <p role="alert" className="mt-2 text-[11px] text-danger">
              {erro}
            </p>
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-edge px-4 py-3">
          <button
            onClick={salvar}
            className="transicao rounded bg-accent px-5 py-2 text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110"
          >
            SALVAR
          </button>
          <button
            onClick={() => aoFechar()}
            className="transicao rounded border border-edge px-4 py-2 text-[12px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
          >
            CANCELAR
          </button>

          <span className="hidden font-mono text-[10px] text-inkDim/60 sm:inline">Ctrl+Enter salva</span>

          <div className="ml-auto flex gap-2">
            {!criando && editado && (
              <button
                onClick={voltarAoOriginal}
                className="transicao rounded border border-edge px-3 py-2 text-[11px] font-bold tracking-wide text-warn hover:bg-panelHover"
              >
                RESTAURAR ORIGINAL
              </button>
            )}
            {!criando &&
              (confirmandoApagar ? (
                <button
                  onClick={apagar}
                  className="transicao rounded bg-danger px-3 py-2 text-[11px] font-bold tracking-wide text-white hover:brightness-110"
                >
                  CONFIRMAR {proprio ? "EXCLUSÃO" : "OCULTAR"}
                </button>
              ) : (
                <button
                  onClick={() => setConfirmandoApagar(true)}
                  className="transicao rounded border border-danger/50 px-3 py-2 text-[11px] font-bold tracking-wide text-danger hover:bg-danger/10"
                >
                  {proprio ? "APAGAR" : "OCULTAR"}
                </button>
              ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
