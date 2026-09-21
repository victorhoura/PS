"use client";

import { useEffect, useRef, useState } from "react";
import {
  criarApac,
  criarSadt,
  editarApac,
  editarSadt,
  ehNovo,
  escondidos,
  foiEditado,
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[6vh]">
      <div
        ref={caixa}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Modelos prontos"
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-edge bg-panel shadow-painel outline-none"
      >
        <header className="flex items-center gap-3 border-b border-edge px-4 py-3">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
            {editando === null
              ? "MODELOS PRONTOS"
              : editando === "novo"
                ? "NOVO MODELO"
                : "EDITAR MODELO"}
          </h2>
          <span className="tabular ml-auto font-mono text-[10px] text-inkDim">
            {editando === null ? `${modelos.length}` : ""}
          </span>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="transicao flex h-7 w-7 items-center justify-center rounded-md border border-edge text-inkDim hover:bg-panelHover hover:text-ink"
          >
            <IconeFechar tamanho={14} />
          </button>
        </header>

        {editando === null ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {modelos.length === 0 && (
                <p className="px-2 py-10 text-center text-[11px] leading-relaxed text-inkDim">
                  Nenhum modelo ainda. Crie o primeiro — ele passa a aparecer no seletor do
                  formulário, com tudo preenchido.
                </p>
              )}

              <ul className="space-y-1.5">
                {modelos.map((m) => (
                  <li
                    key={m.id}
                    className="transicao flex items-stretch overflow-hidden rounded-lg border border-edge bg-base"
                  >
                    <div className="min-w-0 flex-1 px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        <Marca tipo={tipo} id={m.id} />
                        <span className="truncate text-[12px] font-bold tracking-wide text-ink">
                          {m.nome}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-inkDim">
                        {resumo(m)}
                      </span>
                    </div>

                    <button
                      onClick={() => setEditando(m)}
                      aria-label={`Editar ${m.nome}`}
                      title={`Editar ${m.nome}`}
                      className="transicao flex w-10 shrink-0 items-center justify-center border-l border-edge text-inkDim hover:bg-panelHover hover:text-accent"
                    >
                      <IconeEditar tamanho={14} />
                    </button>
                    <button
                      onClick={() => setConfirmando(m.id)}
                      aria-label={`Excluir ${m.nome}`}
                      title={`Excluir ${m.nome}`}
                      className="transicao flex w-10 shrink-0 items-center justify-center border-l border-edge font-mono text-[15px] text-inkDim hover:bg-danger/10 hover:text-danger"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {confirmando && (
              <div className="flex flex-wrap items-center gap-2 border-t border-danger/40 bg-danger/10 px-4 py-2 text-[11px] text-inkDim">
                <span>
                  Excluir <strong className="text-ink">{modelos.find((m) => m.id === confirmando)?.nome}</strong>?
                  {!ehNovo(confirmando) && " Dá para trazer de volta com RESTAURAR."}
                </span>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => setConfirmando(null)}
                    className="transicao rounded border border-edge px-2.5 py-1 font-bold text-inkDim hover:bg-panelHover hover:text-ink"
                  >
                    CANCELAR
                  </button>
                  <button
                    onClick={() => {
                      remover(tipo, confirmando);
                      setConfirmando(null);
                    }}
                    className="transicao rounded bg-danger px-2.5 py-1 font-bold text-base"
                  >
                    EXCLUIR
                  </button>
                </div>
              </div>
            )}

            <footer className="flex flex-wrap items-center gap-2 border-t border-edge px-4 py-3">
              <button
                onClick={() => setEditando("novo")}
                className="transicao flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[11px] font-bold tracking-wide text-accentInk hover:brightness-110"
              >
                <IconeMais tamanho={14} />
                NOVO MODELO
              </button>

              {ocultos > 0 && (
                <button
                  onClick={() => restaurarBase(tipo)}
                  className="transicao rounded-lg border border-edge px-3 py-2 text-[11px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
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

/** Ponto que distingue modelo seu (accent) de original editado (warn). */
function Marca({ tipo, id }: { tipo: Tipo; id: string }) {
  if (ehNovo(id)) {
    return <span title="Modelo seu" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />;
  }
  if (foiEditado(tipo, id)) {
    return (
      <span title="Original editado por você" className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
    );
  }
  return null;
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

      <footer className="flex gap-2 border-t border-edge px-4 py-3">
        <button
          type="submit"
          className="transicao flex-1 rounded-lg bg-accent px-4 py-2 text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110"
        >
          SALVAR
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="transicao rounded-lg border border-edge px-4 py-2 text-[12px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
        >
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
        className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim"
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
        className="h-8 w-full rounded-lg border border-edge bg-base px-3 text-[12px] text-ink outline-none focus:border-accent"
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
        className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim"
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
        className="w-full resize-y rounded-lg border border-edge bg-base px-3 py-2 font-mono text-[11px] leading-relaxed text-ink outline-none focus:border-accent"
      />
    </div>
  );
}
