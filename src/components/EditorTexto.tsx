"use client";

import { useEffect, useRef, useState } from "react";
import type { CategoriaSlug, Snippet } from "@/lib/types";
import {
  criar,
  editar,
  ehNovo,
  foiEditado,
  motivoParaNaoGravar,
  remover,
  restaurar,
} from "@/lib/repositorio";

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
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);
  const nomeRef = useRef<HTMLInputElement>(null);

  const editado = alvo ? foiEditado(alvo.id) : false;
  const proprio = alvo ? ehNovo(alvo.id) : true;

  const alterado = nome !== (alvo?.nome ?? "") || texto !== (alvo?.texto ?? "");

  /** Só fecha direto se não há nada a perder; senão pede confirmação. */
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
    // Recusado, a caixa fica aberta com o que você digitou: fechar aqui
    // jogaria fora a receita inteira por causa de um segundo de carga.
    if (!ok) {
      setErro(motivoParaNaoGravar());
      return;
    }
    aoFechar(criando ? "Texto criado." : "Texto salvo.");
  }

  /**
   * Seu ou original, o gesto é o mesmo: APAGAR. Antes o original só se
   * "ocultava", como se os textos do PS.py fossem intocáveis — e não são,
   * são seus também. Por baixo o original vira uma lápide na camada, porque a
   * base embutida não muda; para quem usa, apagou, e só volta restaurando um
   * backup de antes.
   */
  function apagar() {
    if (!alvo) return;
    if (!remover(alvo.id)) {
      setConfirmandoApagar(false);
      setErro(motivoParaNaoGravar());
      return;
    }
    aoFechar("Texto apagado.");
  }

  function voltarAoOriginal() {
    if (!alvo) return;
    if (!restaurar(alvo.id)) {
      setErro(motivoParaNaoGravar());
      return;
    }
    aoFechar("Texto original restaurado.");
  }

  return (
    // Clicar fora NÃO fecha: aqui se digita receita, e perder o texto por um
    // clique torto ao lado da caixa é o tipo de coisa que faz desistir de usar.
    // A saída é sempre deliberada: Salvar, Cancelar ou Esc.
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-[2px] p-4 pt-[6vh]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={criando ? "Criar texto" : "Editar texto"}
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-edge bg-panel shadow-painel"
      >
        <header className="flex items-center justify-between gap-3 border-b border-edge px-4 py-3">
          <h2 className="text-[13px] font-semibold tracking-wide text-ink">
            {criando ? "NOVO TEXTO" : "EDITAR TEXTO"}
          </h2>
          <span className="flex items-center gap-2 text-[11px] text-inkDim">
            {alterado && <span className="font-medium text-warn">não salvo</span>}
            {!criando && !proprio && (editado ? "original editado" : "texto original")}
          </span>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <label htmlFor="ed-nome" className="mb-1.5 block rotulo">
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
            className="mb-4 w-full rounded-lg border border-edge bg-base px-3 py-2 text-[12px] font-semibold tracking-wide text-ink outline-none placeholder:text-inkDim/50 focus:border-accent"
          />

          <label htmlFor="ed-texto" className="mb-1.5 block rotulo">
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
            className="w-full resize-y rounded-lg border border-edge bg-base px-3 py-2 font-mono text-[11px] leading-relaxed text-ink outline-none placeholder:text-inkDim/50 focus:border-accent"
          />

          {erro && (
            <p role="alert" className="mt-2 text-[11px] text-danger">
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
              className="transicao rounded-lg bg-accent px-4 py-1.5 text-[11px] font-semibold tracking-wide text-accentInk shadow-cartao hover:brightness-110"
            >
              CONTINUAR EDITANDO
            </button>
            <button
              onClick={() => aoFechar()}
              className="transicao rounded-lg border border-danger/40 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-danger hover:bg-danger/10"
            >
              DESCARTAR
            </button>
          </div>
        )}

        <footer className="flex flex-wrap items-center gap-2 border-t border-edge bg-base/30 px-4 py-3">
          <button
            onClick={salvar}
            className="transicao rounded-lg bg-accent px-5 py-2 text-[12px] font-semibold tracking-wide text-accentInk shadow-cartao hover:brightness-110"
          >
            SALVAR
          </button>
          <button
            onClick={tentarFechar}
            className="transicao rounded-lg border border-edge px-4 py-2 text-[12px] font-semibold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
          >
            CANCELAR
          </button>

          <span className="hidden text-[10.5px] text-inkDim/60 sm:inline">Ctrl+Enter salva</span>

          <div className="ml-auto flex gap-2">
            {!criando && editado && (
              <button
                onClick={voltarAoOriginal}
                className="transicao rounded-lg border border-edge px-3 py-2 text-[11px] font-semibold tracking-wide text-warn hover:bg-panelHover"
              >
                RESTAURAR ORIGINAL
              </button>
            )}
            {!criando &&
              (confirmandoApagar ? (
                <button
                  onClick={apagar}
                  className="transicao rounded-lg bg-danger px-3 py-2 text-[11px] font-semibold tracking-wide text-white hover:brightness-110"
                >
                  CONFIRMAR EXCLUSÃO
                </button>
              ) : (
                <button
                  onClick={() => setConfirmandoApagar(true)}
                  className="transicao rounded-lg border border-danger/40 px-3 py-2 text-[11px] font-semibold tracking-wide text-danger hover:bg-danger/10"
                >
                  APAGAR
                </button>
              ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
