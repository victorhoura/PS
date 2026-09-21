"use client";

import { useCallback, useSyncExternalStore } from "react";
import { aplicarTema, inscreverTema, lerTema, type Tema } from "@/lib/tema";

const NO_SERVIDOR = (): Tema => "escuro";

/**
 * O tema que está valendo, lido do <html> e não de uma cópia.
 *
 * Antes isto era um `useState` preenchido uma única vez na montagem. O
 * problema aparecia quando o tema mudava depois disso — em máquina nova, a
 * preferência chega da nuvem alguns instantes após a tela montar: a página
 * ficava clara e o botão continuava oferecendo "TEMA CLARO", porque a cópia
 * dele tinha nascido "escuro" e ninguém a atualizava. O primeiro clique
 * então aplicava "claro" sobre "claro" e não acontecia nada visível; só o
 * segundo funcionava.
 *
 * Lendo o atributo direto, o botão não tem cópia para ficar desatualizada.
 * No servidor vale o escuro, que é como o HTML nasce — assim a hidratação
 * encontra o mesmo que foi enviado.
 */
export function useTema(): { tema: Tema; alternar: () => void } {
  const tema = useSyncExternalStore(inscreverTema, lerTema, NO_SERVIDOR);

  const alternar = useCallback(() => {
    aplicarTema(tema === "escuro" ? "claro" : "escuro");
  }, [tema]);

  return { tema, alternar };
}
