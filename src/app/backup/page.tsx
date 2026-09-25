"use client";

import { useRef, useState } from "react";
import { exportar, importar } from "@/lib/repositorio";
import { useEstadoTextos, useResumo, useTextos } from "@/hooks/useTextos";

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
  // Baixar antes de os seus textos chegarem salvaria um arquivo vazio, e
  // restaurar seria desfeito pela resposta que ainda vem.
  const carregando = useEstadoTextos().estado === "carregando";
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
    <div className="pagina">
      <header className="mb-5">
        <h1 className="titulo-pagina">BACKUP</h1>
        <p className="subtitulo">
          Seus textos ficam guardados na nuvem e acompanham você em qualquer computador. Aqui você
          baixa uma cópia em arquivo, para o caso de o banco falhar, e restaura a partir dela.
        </p>
      </header>

      {aviso && (
        <p
          role="status"
          className={`mb-4 max-w-2xl rounded-xl border px-3 py-2 text-[11px] ${
            aviso.ok ? "border-ok/30 bg-ok/10 text-ok" : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <section className="mb-4 max-w-2xl rounded-xl border border-edge bg-panel p-4 shadow-cartao">
        <h2 className="mb-1.5 rotulo">
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
          disabled={carregando || alteracoes === 0}
          className="botao botao-primario"
        >
          BAIXAR BACKUP
        </button>
        {/* Na linha de baixo, e não colado ao botão: ao lado, numa janela
            estreita, a frase quebrava pela metade embaixo dele. */}
        {(carregando || alteracoes === 0) && (
          <p className="nota mt-2">
            {carregando ? "Carregando seus textos…" : "Nada seu para salvar ainda."}
          </p>
        )}
      </section>

      <section className="max-w-2xl rounded-xl border border-edge bg-panel p-4 shadow-cartao">
        <h2 className="mb-1.5 rotulo">
          RESTAURAR BACKUP
        </h2>
        <p className="mb-3 text-[11px] leading-relaxed text-inkDim">
          Carrega um backup e o envia para a nuvem.{" "}
          <strong className="text-warn">Substitui</strong> o que estiver lá agora, em todos os
          computadores.
        </p>
        {/*
          Um botão do app no lugar do campo de arquivo do navegador, que
          escrevia "Choose File / No file chosen" (ou o equivalente no idioma
          do Windows) com o desenho do sistema. O campo continua ali, invisível
          mas focável pelo teclado; o anel aparece no botão.
        */}
        <label
          aria-disabled={carregando}
          className={`botao botao-secundario cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
            carregando ? "pointer-events-none opacity-50" : ""
          }`}
        >
          ESCOLHER ARQUIVO…
          <input
            ref={arquivoRef}
            type="file"
            accept="application/json,.json"
            onChange={carregar}
            disabled={carregando}
            className="sr-only"
          />
        </label>
      </section>

      <p className="nota mt-6 max-w-2xl">
        {carregando ? "Carregando seus textos…" : `Total no app agora: ${textos.length} textos.`} A
        sincronização entre computadores é automática pela nuvem; o arquivo daqui é a cópia que
        sobra se o banco falhar.
      </p>
    </div>
  );
}
