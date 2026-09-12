"use client";

import { useTema } from "@/hooks/useTema";
import { IconeLua, IconeSol } from "./Icones";

/**
 * Alterna claro/escuro. Até montar mostra o ícone do tema escuro, que é o
 * padrão — assim o servidor e o cliente desenham a mesma coisa e a hidratação
 * não reclama.
 */
export function BotaoTema({ compacto = false }: { compacto?: boolean }) {
  const { tema, alternar, montado } = useTema();
  const claro = montado && tema === "claro";
  const rotulo = claro ? "Mudar para tema escuro" : "Mudar para tema claro";

  if (compacto) {
    return (
      <button
        onClick={alternar}
        aria-label={rotulo}
        title={rotulo}
        className="transicao flex h-8 w-8 items-center justify-center rounded-md border border-edge text-inkDim hover:bg-panelHover hover:text-ink"
      >
        {claro ? <IconeLua /> : <IconeSol />}
      </button>
    );
  }

  return (
    <button
      onClick={alternar}
      aria-label={rotulo}
      className="transicao flex w-full items-center gap-2 rounded-md px-3 py-2 text-[11px] font-semibold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
    >
      {claro ? <IconeLua tamanho={14} /> : <IconeSol tamanho={14} />}
      {claro ? "TEMA ESCURO" : "TEMA CLARO"}
    </button>
  );
}
