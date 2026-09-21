"use client";

import { useEffect, useState } from "react";
import {
  carregarPreferencias,
  definirPreferencia,
  preferenciasAtuais,
} from "@/lib/preferencias";

/**
 * Contador de atendimentos. O original zerava ao fechar a janela; aqui o valor
 * sobrevive a recarregar a página, que é o que faz sentido num plantão de 12h.
 *
 * Fica na nuvem, não na máquina: o app roda em computador compartilhado e não
 * grava nada no disco. De quebra, o plantão continua do mesmo número se você
 * trocar de computador no meio.
 */
export default function Contador() {
  const [n, setN] = useState(0);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    let vivo = true;
    void carregarPreferencias().then(() => {
      if (!vivo) return;
      setN(preferenciasAtuais().contador ?? 0);
      setCarregado(true);
    });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    // Só depois de carregar: senão o zero inicial sobrescreve o valor do banco.
    if (!carregado) return;
    definirPreferencia("contador", n);
  }, [n, carregado]);

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <h1 className="mb-6 font-mono text-base font-bold tracking-[0.16em] text-ink">CONTADOR</h1>

      <output className="mb-6 font-mono text-7xl font-bold tabular text-accent">{n}</output>

      <div className="flex gap-3">
        <button
          onClick={() => setN((v) => Math.max(0, v - 1))}
          className="transicao rounded-lg border border-edge bg-panel px-8 py-4 font-mono text-2xl font-bold text-ink hover:bg-panelHover"
          aria-label="Diminuir"
        >
          −
        </button>
        <button
          onClick={() => setN((v) => v + 1)}
          className="transicao rounded-lg bg-accent px-8 py-4 font-mono text-2xl font-bold text-accentInk hover:brightness-110"
          aria-label="Aumentar"
        >
          +
        </button>
      </div>

      <button
        onClick={() => setN(0)}
        className="transicao mt-8 rounded-md border border-edge px-4 py-1.5 text-[11px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
      >
        ZERAR
      </button>
    </div>
  );
}
