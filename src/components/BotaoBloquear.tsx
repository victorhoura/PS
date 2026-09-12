"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconeCadeado } from "./Icones";

/**
 * Bloqueia e volta para a tela de senha. A navegação é um replace para que o
 * botão "voltar" do navegador não devolva a tela que acabou de ser trancada.
 */
export function BotaoBloquear({ compacto = false }: { compacto?: boolean }) {
  const [saindo, setSaindo] = useState(false);
  const router = useRouter();

  async function bloquear() {
    setSaindo(true);
    try {
      await fetch("/api/sair", { method: "POST" });
    } catch {
      // Sem rede o cookie continua no navegador; a navegação abaixo ainda
      // leva para a tela de senha, e o proxy tranca no próximo acesso online.
    }
    router.replace("/entrar");
    router.refresh();
  }

  if (compacto) {
    return (
      <button
        onClick={() => void bloquear()}
        disabled={saindo}
        aria-label="Bloquear"
        title="Bloquear"
        className="transicao flex h-8 w-8 items-center justify-center rounded-md border border-edge text-inkDim hover:bg-panelHover hover:text-ink disabled:opacity-50"
      >
        <IconeCadeado />
      </button>
    );
  }

  return (
    <button
      onClick={() => void bloquear()}
      disabled={saindo}
      className="transicao flex w-full items-center gap-2 rounded-md px-3 py-2 text-[11px] font-semibold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink disabled:opacity-50"
    >
      <IconeCadeado tamanho={14} />
      {saindo ? "BLOQUEANDO…" : "BLOQUEAR"}
    </button>
  );
}
