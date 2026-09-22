"use client";

import { useEffect, useSyncExternalStore } from "react";
import { carregarLinks, inscreverLinks, linksAtuais, linksNoServidor } from "@/lib/links";

/**
 * A lista de links, que se redesenha quando você cria, edita ou exclui um.
 *
 * O snapshot do servidor é a lista embutida: na hidratação o React usa ela, e
 * a lista da nuvem entra no render seguinte. Sem isso o HTML do servidor e o
 * do cliente divergiriam.
 */
export function useLinks() {
  useEffect(() => {
    void carregarLinks();
  }, []);

  return useSyncExternalStore(inscreverLinks, linksAtuais, linksNoServidor);
}
