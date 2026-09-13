"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  inscrever,
  resumoCamada,
  resumoNoServidor,
  sincronizarTextos,
  todos,
  todosNoServidor,
} from "@/lib/repositorio";

/**
 * Lê a lista de textos e redesenha sozinho quando algo é criado, editado ou
 * apagado — inclusive quando a mudança veio de outra aba.
 *
 * O snapshot do servidor é só a base embutida: na hidratação o React usa ele,
 * e a camada local entra no render seguinte. Sem isso o HTML do servidor e o
 * do cliente divergiriam.
 */
export function useTextos() {
  // Uma vez por carregamento; a função se protege de chamadas repetidas.
  useEffect(() => {
    void sincronizarTextos();
  }, []);

  return useSyncExternalStore(inscrever, todos, todosNoServidor);
}

/** Quantos textos seus existem. Mesmo contrato de hidratação do useTextos. */
export function useResumo() {
  return useSyncExternalStore(inscrever, resumoCamada, resumoNoServidor);
}
