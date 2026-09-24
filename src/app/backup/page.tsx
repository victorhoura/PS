"use client";

import { useRef, useState } from "react";
import { exportar, importar } from "@/lib/repositorio";
import { useResumo, useTextos } from "@/hooks/useTextos";

/**
 * Seus textos moram no Supabase, não nesta máquina. Esta tela existe como
 * rede de segurança: baixar uma cópia em arquivo para o caso de o banco sumir,
 * e restaurar a partir dela. Só isso.
 *
 * Já houve aqui um VOLTAR AO ORIGINAL, que desfazia tudo e devolvia os textos
 * do PS.py. Saiu porque aqueles textos foram o ponto de partida, não um molde
 * para onde voltar: a medicina muda, e o que você corrigiu, criou e apagou é
 * o conteúdo do app agora. Desfazer tudo de uma vez só servia para regredir a
 * um esqueleto desatualizado.
 */
export default function Backup() {
  const textos = useTextos();
  const resumo = useResumo();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const alteracoes = resumo.novos + resumo.editados + resumo.removidos;

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
        Seus textos ficam guardados na nuvem e acompanham você em qualquer computador. Aqui você
        baixa uma cópia em arquivo, para o caso de o banco falhar, e restaura a partir dela.
      </p>

      {aviso && (
        <p
          role="status"
          className={`mb-4 max-w-2xl rounded-lg border px-3 py-2 text-[11px] ${
            aviso.ok ? "border-ok/40 bg-ok/10 text-ok" : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <section className="mb-6 max-w-2xl rounded-lg border border-edge bg-panel p-4">
        <h2 className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim/70">
          FAZER BACKUP
        </h2>
        <p className="mb-3 text-[11px] leading-relaxed text-inkDim">
          Baixa um arquivo com tudo o que você criou, editou e apagou nos textos
          {alteracoes > 0 &&
            ` — hoje, ${alteracoes === 1 ? "1 alteração" : `${alteracoes} alterações`}`}
          . Guarde junto com seus documentos, e refaça depois de uma sessão em que você mexeu
          bastante.
        </p>
        <button
          onClick={baixar}
          disabled={alteracoes === 0}
          className="transicao rounded-lg bg-accent px-5 py-2 text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
        >
          BAIXAR BACKUP
        </button>
        {alteracoes === 0 && (
          <span className="ml-3 text-[11px] text-inkDim">Nada seu para salvar ainda.</span>
        )}
      </section>

      <section className="max-w-2xl rounded-lg border border-edge bg-panel p-4">
        <h2 className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim/70">
          RESTAURAR BACKUP
        </h2>
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

      <p className="mt-6 max-w-2xl text-[10px] leading-relaxed text-inkDim/70">
        Total no app agora: {textos.length} textos. A sincronização entre computadores é
        automática pela nuvem; o arquivo daqui é a cópia que sobra se o banco falhar.
      </p>
    </div>
  );
}
