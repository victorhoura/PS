"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  apacNoServidor,
  estadoDosModelos,
  estadoNoServidor,
  inscreverModelos,
  modelosApac,
  modelosSadt,
  sadtNoServidor,
  sincronizarModelos,
} from "@/lib/modelos";

/**
 * Os modelos prontos, base mais a sua camada.
 *
 * O snapshot do servidor traz só a base, como nos textos: na hidratação o
 * React usa ele e a camada da nuvem entra no render seguinte.
 */
export function useModelosApac() {
  useEffect(() => {
    void sincronizarModelos();
  }, []);
  return useSyncExternalStore(inscreverModelos, modelosApac, apacNoServidor);
}

export function useModelosSadt() {
  useEffect(() => {
    void sincronizarModelos();
  }, []);
  return useSyncExternalStore(inscreverModelos, modelosSadt, sadtNoServidor);
}

export function useEstadoModelos() {
  return useSyncExternalStore(inscreverModelos, estadoDosModelos, estadoNoServidor);
}
