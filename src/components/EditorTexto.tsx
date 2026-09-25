"use client";

import { useEffect, useRef, useState } from "react";
import type { CategoriaSlug, Snippet } from "@/lib/types";
import { criar, editar, motivoParaNaoGravar, remover } from "@/lib/repositorio";

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
   *
   * Pelo mesmo motivo não há mais RESTAURAR ORIGINAL, nem o aviso "texto
   * original" no cabeçalho: o que vale é o que está na camada, e voltar atrás
   * — de uma edição ou de uma exclusão — é sempre pelo backup.
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

  return (
    // Clicar fora NÃO fecha: aqui se digita receita, e perder o texto por um
    // clique torto ao lado da caixa é o tipo de coisa que faz desistir de usar.
    // A saída é sempre deliberada: Salvar, Cancelar ou Esc.
    <div className="esmaecer fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[6vh] backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={criando ? "Criar texto" : "Editar texto"}
        className="surgir flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-edge bg-panel shadow-painel"
      >
        <header className="flex items-center justify-between gap-3 border-b border-edge px-4 py-3">
          <h2 className="text-[13px] font-semibold tracking-wide text-ink">
            {criando ? "NOVO TEXTO" : "EDITAR TEXTO"}
          </h2>
          {alterado && <span className="text-[11px] font-medium text-warn">não salvo</span>}
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
            className="campo mb-4 font-semibold tracking-wide"
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
            className="campo resize-y font-mono text-[11px]"
          />

          {erro && (
            <p role="alert" className="mt-2 text-[11px] text-danger">
              {erro}
            </p>
          )}
        </div>

        {/* Estreita, a pergunta e os dois botões empilham na largura toda,
            centrados; larga, tudo numa linha como antes. */}
        {confirmandoDescarte && (
          <div className="grid gap-2 border-t border-warn/40 bg-warn/10 px-4 py-3 sm:flex sm:flex-wrap sm:items-center">
            <span className="text-center text-[11px] font-semibold text-warn sm:mr-1 sm:text-left">
              Descartar o que você digitou?
            </span>
            <button
              onClick={() => setConfirmandoDescarte(false)}
              autoFocus
              className="botao botao-sm botao-primario w-full sm:w-auto"
            >
              CONTINUAR EDITANDO
            </button>
            <button
              onClick={() => aoFechar()}
              className="botao botao-sm botao-perigo w-full sm:w-auto"
            >
              DESCARTAR
            </button>
          </div>
        )}

        <footer className="rodape-acoes border-t border-edge bg-base/30 px-4 py-3">
          <button
            onClick={salvar}
            className="botao botao-primario w-full sm:w-auto sm:px-5"
          >
            SALVAR
          </button>
          <button
            onClick={tentarFechar}
            className="botao botao-secundario w-full sm:w-auto"
          >
            CANCELAR
          </button>

          <span className="hidden text-[10px] text-inkDim/70 sm:inline">Ctrl+Enter salva</span>

          {!criando &&
            (confirmandoApagar ? (
              <button
                onClick={apagar}
                className="botao botao-perigo-cheio col-span-2 w-full sm:ml-auto sm:w-auto"
              >
                CONFIRMAR EXCLUSÃO
              </button>
            ) : (
              <button
                onClick={() => setConfirmandoApagar(true)}
                className="botao botao-perigo col-span-2 w-full sm:ml-auto sm:w-auto"
              >
                APAGAR
              </button>
            ))}
        </footer>
      </div>
    </div>
  );
}
