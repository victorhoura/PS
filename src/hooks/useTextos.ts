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
 * Enquanto a camada não chega, a lista é vazia — no servidor e no cliente —,
 * e quem desenha mostra "carregando" (veja `useEstadoTextos`). Quando ela
 * chega, entra a lista de verdade, de uma vez: nunca a base antes dela.
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
 * Existe porque a nuvem virou a única cópia: enquanto ela não responde não há
 * lista, e sem este estado uma lista vazia seria indistinguível de "os seus
 * textos sumiram". No erro, a lista volta a ser a base, só para copiar.
 */
export function useEstadoTextos() {
  const estado = useSyncExternalStore(inscrever, estadoDosTextos, estadoNoServidor);
  return { estado, motivo: motivoDoErro(), recarregar: recarregarTextos };
}

/** Se há escrita pendente ou falha de gravação na nuvem. */
export function useEstadoNuvem() {
  return useSyncExternalStore(inscreverNuvem, estadoNuvem, estadoNuvemNoServidor) ?? ESTADO_INICIAL;
}
