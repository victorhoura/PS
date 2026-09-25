"use client";

import { useEffect, useRef, useState } from "react";
import {
  criarApac,
  criarSadt,
  editarApac,
  editarSadt,
  ehNovo,
  escondidos,
  remover,
  restaurarBase,
  type ComId,
  type ModeloSadt,
  type Tipo,
} from "@/lib/modelos";
import type { ModeloApac } from "@/data/apac-modelos";
import { IconeEditar, IconeFechar, IconeMais } from "./Icones";

/**
 * Gerenciar os modelos prontos: criar, editar, excluir e restaurar.
 *
 * Os 10 modelos da APAC vêm do APAC.py e ficam intocados na base; editar um
 * grava uma versão por cima e excluir grava uma lápide. Por isso RESTAURAR
 * sempre traz o original de volta, por mais que você tenha mexido. Os da SADT
 * são todos seus, então excluir ali é excluir mesmo.
 */
export function GerenciadorModelos<T extends ModeloApac | ModeloSadt>({
  tipo,
  modelos,
  aoFechar,
}: {
  tipo: Tipo;
  modelos: ComId<T>[];
  aoFechar: () => void;
}) {
  /** null = lista; "novo" = criando; ComId = editando aquele. */
  const [editando, setEditando] = useState<ComId<T> | "novo" | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  // Esc fecha, mas só quando está na lista: no formulário ele seria um
  // descarte silencioso do que está sendo digitado.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (editando === null) aoFechar();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [editando, aoFechar]);

  useEffect(() => caixa.current?.focus(), []);

  const ocultos = escondidos(tipo);

  return (
    <div className="esmaecer fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[6vh] backdrop-blur-[2px]">
      <div
        ref={caixa}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Modelos prontos"
        className="surgir flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-edge bg-panel shadow-painel outline-none"
      >
        <header className="flex items-center gap-2 border-b border-edge py-3 pl-4 pr-2.5">
          <h2 className="min-w-0 truncate text-[13px] font-semibold uppercase tracking-wide text-ink">
            {editando === null
              ? "MODELOS PRONTOS"
              : editando === "novo"
                ? "NOVO MODELO"
                : "EDITAR MODELO"}
          </h2>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {editando === null && (
              // Abaixo de 360px o número sai, para o título caber inteiro.
              <span className="tabular hidden rounded-full bg-panelHover px-2 py-0.5 text-[11px] font-medium text-inkDim min-[360px]:inline">
                {modelos.length}
              </span>
            )}
          </span>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="botao botao-sm botao-icone botao-fantasma"
          >
            <IconeFechar tamanho={14} />
          </button>
        </header>

        {editando === null ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {modelos.length === 0 && (
                <p className="vazio">
                  Nenhum modelo ainda. Use o + para criar o primeiro — ele passa a aparecer no
                  seletor do formulário, com tudo preenchido.
                </p>
              )}

              {/*
                Uma caixa só com divisórias, como as listas de texto, e os
                botões com a largura dos da lista (32px). Com 40px cada um e o
                "×" digitado como letra, os dois comiam o nome do modelo no
                painel estreito.
              */}
              <ul
                className={`anel-dentro divide-y divide-edge overflow-hidden rounded-xl border border-edge bg-base/40 ${
                  modelos.length === 0 ? "hidden" : ""
                }`}
              >
                {modelos.map((m) => (
                  <li
                    key={m.id}
                    className={`transicao flex items-stretch ${
                      confirmando === m.id ? "bg-danger/[0.06]" : "hover:bg-panelHover"
                    }`}
                  >
                    <div className="min-w-0 flex-1 py-2 pl-3 pr-1">
                      <span className="block truncate text-[12px] font-semibold text-ink">
                        {m.nome}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-inkDim">
                        {resumo(m)}
                      </span>
                    </div>

                    <button
                      onClick={() => setEditando(m)}
                      aria-label={`Editar ${m.nome}`}
                      title={`Editar ${m.nome}`}
                      className="transicao flex w-8 shrink-0 items-center justify-center text-inkDim/70 hover:text-accent"
                    >
                      <IconeEditar tamanho={13} />
                    </button>
                    <button
                      onClick={() => setConfirmando(m.id)}
                      aria-label={`Excluir ${m.nome}`}
                      title={`Excluir ${m.nome}`}
                      className="transicao mr-1 flex w-8 shrink-0 items-center justify-center text-inkDim/70 hover:text-danger"
                    >
                      <IconeFechar tamanho={13} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {confirmando && (
              <div className="grid grid-cols-2 gap-2 border-t border-danger/30 bg-danger/[0.07] px-4 py-3 sm:flex sm:flex-wrap sm:items-center">
                <span className="col-span-2 text-center text-[11px] leading-relaxed text-inkDim sm:mr-auto sm:text-left">
                  Excluir <strong className="text-ink">{modelos.find((m) => m.id === confirmando)?.nome}</strong>?
                  {!ehNovo(confirmando) && " Dá para trazer de volta com RESTAURAR."}
                </span>
                <button
                  onClick={() => setConfirmando(null)}
                  className="botao botao-sm botao-secundario w-full sm:w-auto"
                >
                  CANCELAR
                </button>
                <button
                  onClick={() => {
                    remover(tipo, confirmando);
                    setConfirmando(null);
                  }}
                  className="botao botao-sm botao-perigo-cheio w-full sm:w-auto"
                >
                  EXCLUIR
                </button>
              </div>
            )}

            <footer className="flex flex-wrap items-center gap-2 border-t border-edge bg-base/30 px-4 py-3">
              <button
                onClick={() => setEditando("novo")}
                aria-label="Novo modelo"
                title="Novo modelo"
                className="botao botao-sm botao-icone botao-primario"
              >
                <IconeMais tamanho={16} traco={2} />
              </button>

              {ocultos > 0 && (
                <button
                  onClick={() => restaurarBase(tipo)}
                  className="botao botao-sm botao-secundario"
                >
                  {ocultos === 1 ? "RESTAURAR 1 ORIGINAL" : `RESTAURAR OS ${ocultos} ORIGINAIS`}
                </button>
              )}
            </footer>
          </>
        ) : (
          <Formulario
            tipo={tipo}
            alvo={editando === "novo" ? null : editando}
            aoFechar={() => setEditando(null)}
          />
        )}
      </div>
    </div>
  );
}

function resumo(m: ModeloApac | ModeloSadt): string {
  if ("exame" in m) return `${m.cid} · ${m.exame}`;
  return `${m.cid} · ${m.procedimentos.filter(Boolean).join(", ")}`;
}

// ------------------------------------------------------------------ formulário

function Formulario({
  tipo,
  alvo,
  aoFechar,
}: {
  tipo: Tipo;
  alvo: ComId<ModeloApac | ModeloSadt> | null;
  aoFechar: () => void;
}) {
  const ehApac = tipo === "apac";
  const apac = alvo && "exame" in alvo ? alvo : null;
  const sadt = alvo && "hd" in alvo ? alvo : null;

  const [nome, setNome] = useState(alvo?.nome ?? "");
  const [exame, setExame] = useState(apac?.exame ?? "");
  const [diagnostico, setDiagnostico] = useState(apac?.diagnostico ?? "");
  const [hd, setHd] = useState(sadt?.hd ?? "");
  const [cid, setCid] = useState(alvo?.cid ?? "");
  const [texto, setTexto] = useState(apac?.justificativa ?? sadt?.historia ?? "");
  const [procedimentos, setProcedimentos] = useState((sadt?.procedimentos ?? [""]).join("\n"));
  const [erro, setErro] = useState("");

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const n = nome.trim().toUpperCase();
    if (!n) return setErro("Dê um nome ao modelo.");

    if (ehApac) {
      const m: ModeloApac = {
        nome: n,
        exame: exame.trim().toUpperCase(),
        diagnostico: diagnostico.trim().toUpperCase(),
        cid: cid.trim().toUpperCase(),
        justificativa: texto.trim().toUpperCase(),
      };
      if (!m.exame) return setErro("Preencha o exame.");
      alvo ? editarApac(alvo.id, m) : criarApac(m);
    } else {
      const m: ModeloSadt = {
        nome: n,
        hd: hd.trim().toUpperCase(),
        cid: cid.trim().toUpperCase(),
        historia: texto.trim().toUpperCase(),
        procedimentos: procedimentos
          .split("\n")
          .map((p) => p.trim().toUpperCase())
          .filter(Boolean),
      };
      if (!m.procedimentos.length) return setErro("Informe ao menos um procedimento.");
      alvo ? editarSadt(alvo.id, m) : criarSadt(m);
    }
    aoFechar();
  }

  return (
    <form onSubmit={salvar} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <Campo rotulo="NOME DO MODELO" valor={nome} aoMudar={setNome} autoFocus />

        {ehApac ? (
          <>
            <Campo rotulo="EXAME" valor={exame} aoMudar={setExame} />
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <Campo rotulo="DIAGNÓSTICO" valor={diagnostico} aoMudar={setDiagnostico} />
              <Campo rotulo="CID" valor={cid} aoMudar={setCid} />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <Campo rotulo="HD" valor={hd} aoMudar={setHd} />
              <Campo rotulo="CID" valor={cid} aoMudar={setCid} />
            </div>
            <Area
              rotulo="PROCEDIMENTOS"
              dica="um por linha, até 5"
              valor={procedimentos}
              aoMudar={setProcedimentos}
              linhas={3}
            />
          </>
        )}

        <Area
          rotulo={ehApac ? "JUSTIFICATIVA CLÍNICA" : "HISTÓRIA CLÍNICA"}
          valor={texto}
          aoMudar={setTexto}
          linhas={ehApac ? 6 : 3}
        />

        {erro && (
          <p role="alert" className="text-[11px] text-danger">
            {erro}
          </p>
        )}
      </div>

      <footer className="rodape-acoes border-t border-edge bg-base/30 px-4 py-3">
        <button type="submit" className="botao botao-primario w-full sm:w-auto sm:px-5">
          SALVAR
        </button>
        <button type="button" onClick={aoFechar} className="botao botao-secundario w-full sm:w-auto">
          CANCELAR
        </button>
      </footer>
    </form>
  );
}

function Campo({
  rotulo,
  valor,
  aoMudar,
  autoFocus,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  autoFocus?: boolean;
}) {
  const id = `mod-${rotulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block rotulo"
      >
        {rotulo}
      </label>
      <input
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value.toUpperCase())}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        className="campo"
      />
    </div>
  );
}

function Area({
  rotulo,
  dica,
  valor,
  aoMudar,
  linhas,
}: {
  rotulo: string;
  dica?: string;
  valor: string;
  aoMudar: (v: string) => void;
  linhas: number;
}) {
  const id = `mod-${rotulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block rotulo"
      >
        {rotulo}
        {dica && (
          <span className="ml-1.5 font-normal normal-case tracking-normal text-inkDim/60">
            {dica}
          </span>
        )}
      </label>
      <textarea
        id={id}
        rows={linhas}
        value={valor}
        onChange={(e) => aoMudar(e.target.value.toUpperCase())}
        spellCheck={false}
        className="campo resize-y font-mono text-[11px]"
      />
    </div>
  );
}
