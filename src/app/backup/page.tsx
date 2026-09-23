"use client";

import { useRef, useState } from "react";
import { exportar, importar, limparTudo } from "@/lib/repositorio";
import { useResumo, useTextos } from "@/hooks/useTextos";
import { SNIPPETS } from "@/data/snippets";

/**
 * Seus textos moram no Supabase, não nesta máquina. Esta tela existe como
 * rede de segurança: baixar uma cópia em arquivo para o caso de o banco sumir,
 * e restaurar a partir dela.
 */
export default function Backup() {
  const textos = useTextos();
  const resumo = useResumo();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const temCamada = resumo.novos + resumo.editados + resumo.removidos > 0;

  function baixar() {
    const blob = new Blob([exportar()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ps-japa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setAviso({ ok: true, texto: "Backup baixado." });
  }

  async function carregar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const r = importar(await arquivo.text());
    setAviso({ ok: r.ok, texto: r.mensagem });
    if (arquivoRef.current) arquivoRef.current.value = "";
  }

  return (
    <div className="p-3 lg:p-4">
      <h1 className="mb-1 font-mono text-base font-bold tracking-[0.16em] text-ink">BACKUP</h1>
      <p className="mb-6 max-w-2xl text-[11px] leading-relaxed text-inkDim">
        Os {SNIPPETS.length} textos originais vêm dentro do app e não se perdem nunca. O que{" "}
        <strong className="text-ink">você</strong> cria e edita fica guardado na nuvem e acompanha
        você em qualquer computador — é isso que esta tela salva em arquivo e restaura.
      </p>

      <div className="mb-6 grid grid-cols-3 gap-2 sm:max-w-md">
        <Contador rotulo="SEUS TEXTOS" valor={resumo.novos} cor="text-accent" />
        <Contador rotulo="EDITADOS" valor={resumo.editados} cor="text-warn" />
        <Contador rotulo="OCULTOS" valor={resumo.removidos} cor="text-inkDim" />
      </div>

      {aviso && (
        <p
          role="status"
          className={`mb-4 rounded-lg border px-3 py-2 text-[11px] ${
            aviso.ok ? "border-ok/40 bg-ok/10 text-ok" : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <section className="mb-6 max-w-2xl rounded-lg border border-edge bg-panel p-4">
        <h2 className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim/70">SALVAR</h2>
        <p className="mb-3 text-[11px] leading-relaxed text-inkDim">
          Baixa um arquivo com tudo que você criou e editou. Guarde junto com seus documentos —
          e refaça depois de uma sessão em que você mexeu bastante.
        </p>
        <button
          onClick={baixar}
          disabled={!temCamada}
          className="transicao rounded-lg bg-accent px-5 py-2 text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
        >
          BAIXAR BACKUP
        </button>
        {!temCamada && (
          <span className="ml-3 text-[11px] text-inkDim">Nada seu para salvar ainda.</span>
        )}
      </section>

      <section className="mb-6 max-w-2xl rounded-lg border border-edge bg-panel p-4">
        <h2 className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim/70">RESTAURAR</h2>
        <p className="mb-3 text-[11px] leading-relaxed text-inkDim">
          Carrega um backup e o envia para a nuvem.{" "}
          <strong className="text-warn">Substitui</strong> o que estiver lá agora, em todos os
          computadores.
        </p>
        <input
          ref={arquivoRef}
          type="file"
          accept="application/json,.json"
          onChange={carregar}
          className="block w-full text-[11px] text-inkDim file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-edge file:px-4 file:py-2 file:text-[11px] file:font-bold file:tracking-wide file:text-ink hover:file:bg-panelHover"
        />
      </section>

      <section className="max-w-2xl rounded-lg border border-danger/30 bg-danger/5 p-4">
        <h2 className="mb-1.5 font-mono text-[11px] font-bold tracking-widest text-danger">
          VOLTAR AO ORIGINAL
        </h2>
        <p className="mb-3 text-[11px] leading-relaxed text-inkDim">
          Apaga tudo que você criou e editou, devolvendo os {SNIPPETS.length} textos originais do
          app. Baixe o backup antes.
        </p>
        {confirmandoLimpeza ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                limparTudo();
                setConfirmandoLimpeza(false);
                setAviso({ ok: true, texto: "Voltou ao conteúdo original." });
              }}
              className="transicao rounded-md bg-danger px-4 py-2 text-[11px] font-bold tracking-wide text-white hover:brightness-110"
            >
              CONFIRMAR — APAGA {resumo.novos + resumo.editados} ALTERAÇÕES
            </button>
            <button
              onClick={() => setConfirmandoLimpeza(false)}
              className="transicao rounded-md border border-edge px-4 py-2 text-[11px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
            >
              CANCELAR
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmandoLimpeza(true)}
            disabled={!temCamada}
            className="transicao rounded-md border border-danger/50 px-4 py-2 text-[11px] font-bold tracking-wide text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            APAGAR MINHAS ALTERAÇÕES
          </button>
        )}
      </section>

      <p className="mt-6 max-w-2xl text-[10px] leading-relaxed text-inkDim/70">
        Total no app agora: {textos.length} textos. A sincronização entre computadores é
        automática pela nuvem; o arquivo daqui é a cópia que sobra se o banco falhar.
      </p>
    </div>
  );
}

function Contador({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <div className="rounded-lg border border-edge bg-panel px-3 py-2">
      <span className={`block font-mono text-xl font-bold tabular ${cor}`}>{valor}</span>
      <span className="mt-0.5 block font-mono text-[9px] tracking-widest text-inkDim">{rotulo}</span>
    </div>
  );
}
