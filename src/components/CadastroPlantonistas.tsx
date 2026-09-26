"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MAX_NOME, cadastrar, descadastrar } from "@/lib/plantao";
import { IconeFechar, IconeMais } from "./Icones";

/**
 * Cadastro dos plantonistas de sempre, para a Divisão de Plantão: quem está
 * aqui aparece no + de cada nome da divisão.
 *
 * O desenho é o do GERENCIAR modelos da APAC — título com a contagem, a
 * lista numa caixa só com divisórias e o × de cada linha com a largura dos
 * botões da lista. Um nome é pouco para pedir confirmação: remover é um
 * toque, e cadastrar de novo são dois segundos.
 *
 * Grava sozinho, a cada mudança, nas preferências da nuvem. Não há SALVAR
 * para esquecer, e fechar por qualquer caminho (×, Esc, fora da janela) não
 * perde nada.
 */
export function CadastroPlantonistas({
  cadastrados,
  sugestoes,
  aoMudar,
  aoFechar,
}: {
  cadastrados: string[];
  /** Nomes digitados na divisão que ainda não estão aqui — um toque cadastra. */
  sugestoes: string[];
  aoMudar: (lista: string[]) => void;
  aoFechar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const caixa = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const idTitulo = useId();

  // Esc fecha só a janela: sem parar aqui ele seguia para a moldura, que
  // volta ao início.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      aoFechar();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [aoFechar]);

  // Com mouse, o foco vai para o campo — digitar é o que se vem fazer aqui.
  // No celular fica na janela: o teclado subindo sozinho cobriria a lista de
  // quem só veio remover um nome. Ao fechar, volta para quem abriu.
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    if (window.matchMedia("(pointer: fine)").matches) campo.current?.focus();
    else caixa.current?.focus();
    return () => antes?.focus?.();
  }, []);

  function incluir(n: string): boolean {
    const r = cadastrar(cadastrados, n);
    if ("erro" in r) {
      setErro(r.erro);
      return false;
    }
    aoMudar(r.lista);
    setErro("");
    return true;
  }

  return (
    <div
      className="esmaecer fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[6vh] backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div
        ref={caixa}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="surgir flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-edge bg-panel shadow-painel outline-none"
      >
        <header className="flex items-center gap-2 border-b border-edge py-3 pl-4 pr-2.5">
          <h2 id={idTitulo} className="min-w-0 text-[13px] font-semibold uppercase leading-tight tracking-wide text-ink">
            Plantonistas cadastrados
          </h2>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {/* Abaixo de 360px o número sai, para o título caber. */}
            <span className="tabular hidden rounded-full bg-panelHover px-2 py-0.5 text-[11px] font-medium text-inkDim min-[360px]:inline">
              {cadastrados.length}
            </span>
          </span>
          <button onClick={aoFechar} aria-label="Fechar" className="botao botao-sm botao-icone botao-fantasma">
            <IconeFechar tamanho={14} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (incluir(nome)) setNome("");
            }}
            className="flex gap-2"
          >
            <input
              ref={campo}
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                setErro("");
              }}
              placeholder="NOVO NOME"
              aria-label="Nome do plantonista"
              maxLength={MAX_NOME}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              className="campo uppercase"
            />
            <button
              type="submit"
              aria-label="Cadastrar"
              title="Cadastrar"
              className="botao botao-icone botao-primario"
            >
              <IconeMais tamanho={16} traco={2} />
            </button>
          </form>
          {erro && (
            <p role="alert" className="-mt-1 text-[11px] text-danger">
              {erro}
            </p>
          )}

          {sugestoes.length > 0 && (
            <div>
              <p className="rotulo mb-1.5">Da divisão de agora</p>
              <div className="flex flex-wrap gap-1.5">
                {sugestoes.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      incluir(s);
                      caixa.current?.focus();
                    }}
                    aria-label={`Cadastrar ${s}`}
                    className="transicao inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-dashed border-accent/45 px-2.5 text-[11px] font-semibold text-accent hover:border-accent/70 hover:bg-accent/10 toque:h-8"
                  >
                    <IconeMais tamanho={11} traco={2.25} />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {cadastrados.length === 0 ? (
            <p className="vazio">
              Nenhum plantonista cadastrado ainda. Escreva o nome e toque no + — ele passa a aparecer
              no + de cada nome da divisão.
            </p>
          ) : (
            <ul className="anel-dentro divide-y divide-edge overflow-hidden rounded-xl border border-edge bg-base/40">
              {cadastrados.map((c) => (
                <li key={c} className="transicao flex items-stretch hover:bg-panelHover">
                  <span className="min-w-0 flex-1 truncate py-2 pl-3 pr-1 text-[12px] font-semibold leading-5 text-ink toque:py-2.5">
                    {c}
                  </span>
                  <button
                    onClick={() => {
                      aoMudar(descadastrar(cadastrados, c));
                      caixa.current?.focus();
                    }}
                    aria-label={`Remover ${c}`}
                    title={`Remover ${c}`}
                    className="transicao mr-1 flex w-8 shrink-0 items-center justify-center text-inkDim/70 hover:text-danger toque:w-10"
                  >
                    <IconeFechar tamanho={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
