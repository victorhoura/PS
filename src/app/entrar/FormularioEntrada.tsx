"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { BotaoTema } from "@/components/BotaoTema";
import { IconeCadeado } from "@/components/Icones";
import { conferirOffline, destrancarCache, guardarVerificador, temVerificador } from "@/lib/tranca";

export function FormularioEntrada({ semSenhaConfigurada }: { semSenhaConfigurada: boolean }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const params = useSearchParams();

  /** "//outro.site" também começa com "/" — e levaria para fora do app. */
  function destino(): string {
    const de = params.get("de");
    return de && de.startsWith("/") && !de.startsWith("//") ? de : "/";
  }

  /**
   * Entrar é uma navegação de verdade, não do roteador: o documento é pedido
   * outra vez, o proxy confere o cookie novo e o service worker guarda a
   * página já autenticada. Sem rede é ainda mais necessário — o roteador
   * tentaria buscar o payload RSC e não teria de quem.
   */
  async function abrir() {
    await destrancarCache();
    window.location.replace(destino());
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const r = await fetch("/api/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (r.ok) {
        // Único momento em que se sabe que esta senha é a senha do app: é
        // aqui que se grava o verificador que vai valer no plantão sem rede.
        await guardarVerificador(senha);
        await abrir();
      } else {
        setErro(r.status === 503 ? "Senha não configurada no servidor." : "Senha incorreta.");
        setSenha("");
        setEnviando(false);
      }
    } catch {
      // Sem rede: confere pelo verificador gravado da última entrada online.
      if (await conferirOffline(senha)) {
        await abrir();
        return;
      }
      setErro(
        temVerificador()
          ? "Senha incorreta."
          : "Sem conexão, e esta senha nunca foi conferida neste navegador.",
      );
      setSenha("");
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="absolute right-3 top-3">
        <BotaoTema compacto />
      </div>

      <div className="w-full max-w-[17rem]">
        <div className="mb-7 flex flex-col items-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-edge bg-panel text-accent">
            <IconeCadeado tamanho={20} />
          </div>
          <h1 className="font-mono text-lg font-bold tracking-[0.2em] text-accent">PS JAPA</h1>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-inkDim">
            Pronto socorro
          </p>
        </div>

        {semSenhaConfigurada ? (
          <div className="rounded-lg border border-warn/40 bg-warn/10 p-4">
            <p className="text-[11px] leading-relaxed text-inkDim">
              O app está <strong className="text-warn">sem senha</strong>: falta definir a
              variável <code className="font-mono text-warn">PS_SENHA</code> na Vercel. Enquanto
              isso qualquer pessoa com o endereço entra.
            </p>
            {/* Sem esta saída, quem bloqueasse o app antes de configurar a
                senha ficaria preso nesta tela. */}
            <Link
              href="/"
              className="transicao mt-3 block rounded-md bg-accent px-4 py-2 text-center text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110"
            >
              CONTINUAR ASSIM MESMO
            </Link>
          </div>
        ) : (
          <form onSubmit={enviar}>
            <label
              htmlFor="senha"
              className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.18em] text-inkDim"
            >
              Senha
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoFocus
              autoComplete="current-password"
              className="w-full rounded-lg border border-edge bg-panel px-3 py-3 text-center font-mono text-lg tracking-[0.35em] text-ink outline-none transition-colors focus:border-accent"
            />

            {erro && (
              <p role="alert" className="mt-2 text-center text-[11px] text-danger">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando || !senha}
              className="transicao mt-3 w-full rounded-lg bg-accent px-4 py-2.5 text-[12px] font-bold tracking-[0.12em] text-accentInk hover:brightness-110 disabled:opacity-40"
            >
              {enviando ? "…" : "ENTRAR"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[10px] leading-relaxed text-inkDim/70">
          A sessão dura 180 dias neste navegador. Depois de entrar uma vez, o app abre sem rede.
        </p>
      </div>
    </div>
  );
}
