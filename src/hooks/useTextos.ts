"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  estadoDosTextos,
  estadoNoServidor,
  inscrever,
  motivoDoErro,
  recarregarTextos,
  resumoCamada,
  resumoNoServidor,
  sincronizarTextos,
  todos,
  todosNoServidor,
} from "@/lib/repositorio";
import {
  ESTADO_INICIAL,
  estadoNuvem,
  estadoNoServidor as estadoNuvemNoServidor,
  inscreverNuvem,
} from "@/lib/nuvem";

/**
 * Lê a lista de textos e redesenha sozinho quando algo é criado ou editado.
 *
 * O snapshot do servidor é só a base embutida: na hidratação o React usa ele,
 * e a camada vinda da nuvem entra no render seguinte. Sem isso o HTML do
 * servidor e o do cliente divergiriam.
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

/**
 * Como está a carga da camada.
 *
 * Existe porque a nuvem virou a única cópia: enquanto ela não responde, a
 * lista mostra só os 311 textos da base, e sem este estado isso seria
 * indistinguível de "os seus textos sumiram".
 */
export function useEstadoTextos() {
  const estado = useSyncExternalStore(inscrever, estadoDosTextos, estadoNoServidor);
  return { estado, motivo: motivoDoErro(), recarregar: recarregarTextos };
}

/** Se há escrita pendente ou falha de gravação na nuvem. */
export function useEstadoNuvem() {
  return useSyncExternalStore(inscreverNuvem, estadoNuvem, estadoNuvemNoServidor) ?? ESTADO_INICIAL;
}
