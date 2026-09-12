"use client";

import { useEffect, useState } from "react";
import { IconeCheck, IconeFechar } from "./Icones";

/**
 * Confirmação de cópia. No app desktop o feedback era o próprio clipboard;
 * na web é preciso dizer que copiou, senão o médico cola sem saber o que veio.
 */

type Evento = { texto: string; ok: boolean };

const NOME_EVENTO = "ps:copiado";

export function avisarCopia(texto: string, ok: boolean) {
  window.dispatchEvent(new CustomEvent<Evento>(NOME_EVENTO, { detail: { texto, ok } }));
}

export function AvisoCopia() {
  const [aviso, setAviso] = useState<Evento | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function onCopia(e: Event) {
      setAviso((e as CustomEvent<Evento>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setAviso(null), 1800);
    }
    window.addEventListener(NOME_EVENTO, onCopia);
    return () => {
      window.removeEventListener(NOME_EVENTO, onCopia);
      clearTimeout(timer);
    };
  }, []);

  if (!aviso) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 px-4"
    >
      <div
        className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[11px] font-semibold shadow-painel backdrop-blur-sm ${
          aviso.ok
            ? "border-ok/40 bg-ok/15 text-ok"
            : "border-danger/40 bg-danger/15 text-danger"
        }`}
      >
        {aviso.ok ? <IconeCheck tamanho={14} /> : <IconeFechar tamanho={14} />}
        <span className="truncate">
          {aviso.ok ? aviso.texto : "Não foi possível copiar"}
        </span>
      </div>
    </div>
  );
}
