"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function FormularioEntrada({ semSenhaConfigurada }: { semSenhaConfigurada: boolean }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

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
        const de = params.get("de");
        router.replace(de && de.startsWith("/") ? de : "/");
        router.refresh();
      } else {
        setErro(r.status === 503 ? "Senha não configurada no servidor." : "Senha incorreta.");
        setSenha("");
      }
    } catch {
      setErro("Sem conexão. Se o app já estiver instalado, abra pelo ícone.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <h1 className="mb-1 text-center font-mono text-xl font-bold tracking-widest text-accent">
          PS JAPA
        </h1>
        <p className="mb-6 text-center text-[10px] tracking-widest text-inkDim">PRONTO SOCORRO</p>

        {semSenhaConfigurada ? (
          <div className="rounded border border-warn/40 bg-warn/10 p-4">
            <p className="text-[11px] leading-relaxed text-inkDim">
              O app está <strong className="text-warn">sem senha</strong>: falta definir a
              variável <code className="font-mono text-warn">PS_SENHA</code> na Vercel. Enquanto
              isso qualquer pessoa com o endereço entra.
            </p>
          </div>
        ) : (
          <form onSubmit={enviar}>
            <label htmlFor="senha" className="mb-1.5 block font-mono text-[10px] tracking-widest text-inkDim">
              SENHA
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoFocus
              autoComplete="current-password"
              className="w-full rounded border border-edge bg-panel px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-ink outline-none focus:border-accent"
            />

            {erro && (
              <p role="alert" className="mt-2 text-center text-[11px] text-danger">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando || !senha}
              className="transicao mt-4 w-full rounded bg-accent px-4 py-2.5 text-[12px] font-bold tracking-widest text-accentInk hover:brightness-110 disabled:opacity-40"
            >
              {enviando ? "..." : "ENTRAR"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[10px] leading-relaxed text-inkDim/70">
          A sessão dura 180 dias neste navegador. Depois de entrar uma vez, o app abre
          sem rede.
        </p>
      </div>
    </div>
  );
}
