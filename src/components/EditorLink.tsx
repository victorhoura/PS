"use client";

import { useEffect, useRef, useState } from "react";
import { type Link, removerLink, salvarLink, urlValida } from "@/lib/links";

/**
 * Criar e editar um link. Mesmo formulário para os dois: `alvo` nulo é criar.
 *
 * Segue o EditorTexto de perto — Esc e Ctrl+Enter, confirmação antes de
 * descartar, exclusão em dois toques — porque é o mesmo gesto do app e não
 * faz sentido aprender duas caixas diferentes.
 */
export function EditorLink({
  alvo,
  grupos,
  aoFechar,
}: {
  alvo: Link | null;
  /** Os grupos que já existem, para sugerir em vez de obrigar a digitar. */
  grupos: string[];
  aoFechar: (mensagem?: string) => void;
}) {
  const criando = alvo === null;
  const [nome, setNome] = useState(alvo?.nome ?? "");
  const [url, setUrl] = useState(alvo?.url ?? "");
  const [grupo, setGrupo] = useState(alvo?.grupo ?? grupos[0] ?? "Sistemas do hospital");
  const [erro, setErro] = useState("");
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);
  const nomeRef = useRef<HTMLInputElement>(null);

  const alterado =
    nome !== (alvo?.nome ?? "") ||
    url !== (alvo?.url ?? "") ||
    grupo !== (alvo?.grupo ?? grupos[0] ?? "Sistemas do hospital");

  function tentarFechar() {
    if (alterado) setConfirmandoDescarte(true);
    else aoFechar();
  }

  useEffect(() => {
    nomeRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        tentarFechar();
      }
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
      setErro("Dê um nome ao link.");
      nomeRef.current?.focus();
      return;
    }
    if (!urlValida(url)) {
      setErro("Endereço inválido. Ex.: hospitalarguarulhos.sissonline.com.br");
      return;
    }
    salvarLink({
      id: alvo?.id ?? `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      nome,
      url,
      grupo,
    });
    aoFechar(criando ? "Link criado." : "Link salvo.");
  }

  function apagar() {
    if (!alvo) return;
    removerLink(alvo.id);
    aoFechar("Link excluído.");
  }

  const campo =
    "w-full rounded-lg border border-edge bg-base px-3 py-2 text-[12px] text-ink outline-none placeholder:text-inkDim/50 focus:border-accent";
  const rotulo = "mb-1.5 block font-mono text-[10px] font-bold tracking-widest text-inkDim";

  return (
    // Clicar fora não fecha, como no editor de textos: a saída é deliberada.
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[8vh]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={criando ? "Novo link" : "Editar link"}
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-edge bg-panel shadow-painel"
      >
        <header className="flex items-center justify-between border-b border-edge px-4 py-2">
          <h2 className="font-mono text-[11px] font-bold tracking-widest text-ink">
            {criando ? "NOVO LINK" : "EDITAR LINK"}
          </h2>
          {alterado && <span className="font-mono text-[10px] text-warn">não salvo</span>}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <label htmlFor="li-nome" className={rotulo}>
            NOME
          </label>
          <input
            id="li-nome"
            ref={nomeRef}
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setErro("");
            }}
            placeholder="Ex.: SISS — HOSPITAL GUARULHOS"
            className={`${campo} mb-4 font-bold tracking-wide`}
          />

          <label htmlFor="li-url" className={rotulo}>
            ENDEREÇO
          </label>
          <input
            id="li-url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setErro("");
            }}
            inputMode="url"
            spellCheck={false}
            autoComplete="off"
            placeholder="hospitalarguarulhos.sissonline.com.br"
            className={`${campo} mb-1 font-mono text-[11px]`}
          />
          <p className="mb-4 text-[10px] text-inkDim/70">
            Pode colar o endereço inteiro. Sem o “https://” na frente, ele é acrescentado.
          </p>

          <label htmlFor="li-grupo" className={rotulo}>
            GRUPO
          </label>
          <input
            id="li-grupo"
            value={grupo}
            onChange={(e) => {
              setGrupo(e.target.value);
              setErro("");
            }}
            list="li-grupos"
            placeholder="Sistemas do hospital"
            className={campo}
          />
          {/* Sugere os que já existem, mas deixa digitar um novo: é assim que
              se cria um grupo, sem precisar de outra tela para isso. */}
          <datalist id="li-grupos">
            {grupos.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <p className="mt-1 text-[10px] text-inkDim/70">
            É o título da seção. Digite um nome novo para criar outra.
          </p>

          {erro && (
            <p role="alert" className="mt-3 text-[11px] text-danger">
              {erro}
            </p>
          )}
        </div>

        {confirmandoDescarte && (
          <div className="flex flex-wrap items-center gap-2 border-t border-warn/40 bg-warn/10 px-4 py-3">
            <span className="mr-1 text-[11px] font-semibold text-warn">
              Descartar o que você digitou?
            </span>
            <button
              onClick={() => setConfirmandoDescarte(false)}
              autoFocus
              className="transicao rounded-md bg-accent px-4 py-1.5 text-[11px] font-bold tracking-wide text-accentInk hover:brightness-110"
            >
              CONTINUAR EDITANDO
            </button>
            <button
              onClick={() => aoFechar()}
              className="transicao rounded-md border border-danger/50 px-3 py-1.5 text-[11px] font-bold tracking-wide text-danger hover:bg-danger/10"
            >
              DESCARTAR
            </button>
          </div>
        )}

        <footer className="flex flex-wrap items-center gap-2 border-t border-edge px-4 py-3">
          <button
            onClick={salvar}
            className="transicao rounded-lg bg-accent px-5 py-2 text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110"
          >
            SALVAR
          </button>
          <button
            onClick={tentarFechar}
            className="transicao rounded-md border border-edge px-4 py-2 text-[12px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
          >
            CANCELAR
          </button>

          {!criando && (
            <div className="ml-auto">
              {confirmandoApagar ? (
                <button
                  onClick={apagar}
                  className="transicao rounded-md bg-danger px-3 py-2 text-[11px] font-bold tracking-wide text-white hover:brightness-110"
                >
                  CONFIRMAR EXCLUSÃO
                </button>
              ) : (
                <button
                  onClick={() => setConfirmandoApagar(true)}
                  className="transicao rounded-md border border-danger/50 px-3 py-2 text-[11px] font-bold tracking-wide text-danger hover:bg-danger/10"
                >
                  EXCLUIR
                </button>
              )}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
