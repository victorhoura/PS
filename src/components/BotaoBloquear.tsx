"use client";

import { useState } from "react";
import { trancarCache } from "@/lib/tranca";
import { IconeCadeado } from "./Icones";

/**
 * Bloqueia e volta para a tela de senha.
 *
 * São duas trancas, e as duas precisam ser fechadas:
 *  - o cookie de sessão, que o servidor confere (some com /api/sair);
 *  - o cache do service worker, que responde quando não há rede — sem ele
 *    fechado, bastava ficar offline para o app voltar a abrir.
 *
 * A saída é uma navegação de verdade (location.replace), não do roteador: só
 * assim o documento é pedido outra vez, o proxy roda e nada do que já estava
 * montado em memória sobrevive. O replace ainda impede que o botão "voltar"
 * devolva a tela que acabou de ser trancada.
 */
export function BotaoBloquear({ compacto = false }: { compacto?: boolean }) {
  const [saindo, setSaindo] = useState(false);

  async function bloquear() {
    setSaindo(true);
    try {
      await fetch("/api/sair", { method: "POST" });
    } catch {
      // Sem rede o cookie continua no navegador, mas a tranca do cache abaixo
      // já segura o app; o proxy tranca de novo no próximo acesso online.
    }
    await trancarCache();
    window.location.replace("/entrar");
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
