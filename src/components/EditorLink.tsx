"use client";

import { useEffect, useRef, useState } from "react";
import { type Link, removerLink, salvarLink, urlValida } from "@/lib/links";
import { Seletor } from "./Seletor";

/**
 * Criar e editar um link. Mesmo formulário para os dois: `alvo` nulo é criar.
 *
 * Segue o EditorTexto de perto — Esc e Ctrl+Enter, confirmação antes de
 * descartar, exclusão em dois toques — porque é o mesmo gesto do app e não
 * faz sentido aprender duas caixas diferentes.
 */
/** Valor sentinela da opção que troca a lista pelo campo de texto. */
const NOVO_GRUPO = "\u0000novo";

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
  /** Sem grupo nenhum ainda, não há lista para escolher: cai direto no campo. */
  const [criandoGrupo, setCriandoGrupo] = useState(grupos.length === 0);
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
      // Com a lista de grupos aberta, o Esc é dela: fecha a lista e deixa a
      // janela aberta. O segundo Esc fecha a janela.
      if (e.key === "Escape" && (e.target as HTMLElement | null)?.getAttribute?.("aria-expanded") === "true") {
        return;
      }
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
    if (!grupo.trim()) {
      setErro("Dê um nome ao grupo.");
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

  const rotulo = "mb-1.5 block rotulo";

  return (
    // Clicar fora não fecha, como no editor de textos: a saída é deliberada.
    <div className="esmaecer fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[8vh] backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={criando ? "Novo link" : "Editar link"}
        className="surgir flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-edge bg-panel shadow-painel"
      >
        <header className="flex items-center justify-between gap-3 border-b border-edge px-4 py-3">
          <h2 className="text-[13px] font-semibold tracking-wide text-ink">
            {criando ? "NOVO LINK" : "EDITAR LINK"}
          </h2>
          {alterado && <span className="text-[11px] font-medium text-warn">não salvo</span>}
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
            className="campo mb-4 font-semibold tracking-wide"
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
            className="campo mb-1 font-mono text-[11px]"
          />
          <p className="nota mb-4">
            Pode colar o endereço inteiro. Sem o “https://” na frente, ele é acrescentado.
          </p>

          <label htmlFor="li-grupo" className={rotulo}>
            GRUPO
          </label>
          {/*
            Lista de verdade, e não um <input list> com datalist.
            O datalist FILTRA as opções pelo texto que já está no campo — e
            como o campo nasce preenchido com um grupo, abrir a setinha
            mostrava só aquele, parecendo quebrado. Aqui escolher é escolher,
            e criar um grupo novo é uma opção explícita da própria lista.
          */}
          {criandoGrupo ? (
            // Estreita, o campo fica com a largura toda e o botão desce: lado a
            // lado, o botão espremia o campo a quase nada numa janela de 240px.
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="li-grupo"
                value={grupo}
                onChange={(e) => {
                  setGrupo(e.target.value);
                  setErro("");
                }}
                autoFocus={grupos.length > 0}
                placeholder="Nome do grupo novo"
                className="campo"
              />
              {grupos.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCriandoGrupo(false);
                    setGrupo(grupos[0]);
                  }}
                  className="botao botao-secundario"
                >
                  VOLTAR À LISTA
                </button>
              )}
            </div>
          ) : (
            <Seletor
              id="li-grupo"
              valor={grupo}
              opcoes={[
                ...grupos.map((g) => ({ valor: g, texto: g })),
                { valor: NOVO_GRUPO, texto: "+ criar um grupo novo…", separada: true },
              ]}
              aoMudar={(v) => {
                setErro("");
                if (v === NOVO_GRUPO) {
                  setCriandoGrupo(true);
                  setGrupo("");
                } else {
                  setGrupo(v);
                }
              }}
              vazio="Escolha um grupo"
            />
          )}
          <p className="nota mt-1">
            É o título da seção onde o link aparece.
          </p>

          {erro && (
            <p role="alert" className="mt-3 text-[11px] text-danger">
              {erro}
            </p>
          )}
        </div>

        {/* Mesmo arranjo do editor de textos: estreita, empilha centrado. */}
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
                EXCLUIR
              </button>
            ))}
        </footer>
      </div>
    </div>
  );
}
