"use client";

import { useEffect, useState } from "react";

const CHAVE = "ps-japa:contador";

/**
 * Contador de atendimentos. O original zerava ao fechar a janela; aqui o valor
 * sobrevive a recarregar a página, que é o que faz sentido num plantão de 12h.
 */
export default function Contador() {
  const [n, setN] = useState(0);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) setN(Number(salvo) || 0);
    } catch {
      // localStorage bloqueado (janela anônima): segue com o valor em memória.
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try {
      localStorage.setItem(CHAVE, String(n));
    } catch {
      // idem
    }
  }, [n, carregado]);

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <h1 className="mb-6 font-mono text-lg font-bold tracking-widest text-ink">CONTADOR</h1>

      <output className="mb-8 font-mono text-7xl font-bold tabular-nums text-accent">{n}</output>

      <div className="flex gap-3">
        <button
          onClick={() => setN((v) => Math.max(0, v - 1))}
          className="transicao rounded border border-edge bg-panel px-8 py-4 font-mono text-2xl font-bold text-ink hover:bg-panelHover"
          aria-label="Diminuir"
        >
          −
        </button>
        <button
          onClick={() => setN((v) => v + 1)}
          className="transicao rounded bg-accent px-8 py-4 font-mono text-2xl font-bold text-accentInk hover:brightness-110"
          aria-label="Aumentar"
        >
          +
        </button>
      </div>

      <button
        onClick={() => setN(0)}
        className="transicao mt-8 rounded border border-edge px-4 py-1.5 text-[11px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
      >
        ZERAR
      </button>
    </div>
  );
}
