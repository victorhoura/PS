"use client";

import { useEffect } from "react";

/** Registra o service worker: é o que faz o app abrir com o Wi-Fi do hospital fora. */
export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem SW o app ainda funciona online; não vale quebrar nada por isso.
    });
  }, []);
  return null;
}
