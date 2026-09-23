"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIAS } from "@/data/snippets";
import { CALCULADORAS } from "@/lib/calculadoras";
import { copiar, normalizar } from "@/lib/clipboard";
import { useTextos } from "@/hooks/useTextos";
import { avisarCopia } from "./AvisoCopia";
import { IconeBusca } from "./Icones";

/**
 * Busca global. No PS.py achar "DIPIRONA" era: menu -> FÁRMACOS -> rolar/buscar
 * -> clicar. Aqui é Ctrl+K, "dipi", Enter. É a diferença que mais importa
 * em plantão, onde os 311 textos estão todos a três teclas de distância.
 */

interface Resultado {
  chave: string;
  titulo: string;
  contexto: string;
  /** O que acontece no Enter: copiar o texto ou navegar até a ferramenta. */
  acao: { tipo: "copiar"; texto: string } | { tipo: "ir"; href: string };
  peso: number;
}

const LABEL_CATEGORIA = Object.fromEntries(CATEGORIAS.map((c) => [c.slug, c.label]));

const FERRAMENTAS: Resultado[] = [
  ...CALCULADORAS.map((c) => ({
    chave: `c:${c.slug}`,
    titulo: c.nome,
    contexto: "CALCULADORA",
    acao: { tipo: "ir" as const, href: `/apps/${c.slug}` },
    peso: 1,
  })),
  {
    chave: "t:apac",
    titulo: "GERADOR DE APAC",
    contexto: "FERRAMENTA",
    acao: { tipo: "ir" as const, href: "/apps/apac" },
    peso: 1,
  },
  {
    chave: "t:sadt",
    titulo: "GERADOR DE SADT",
    contexto: "FERRAMENTA",
    acao: { tipo: "ir" as const, href: "/apps/sadt" },
    peso: 1,
  },
  {
    chave: "t:labs",
    titulo: "FORMATADOR DE EXAMES",
    contexto: "FERRAMENTA",
    acao: { tipo: "ir" as const, href: "/apps/labs" },
    peso: 1,
  },
  {
    chave: "t:texto",
    titulo: "CONVERSOR DE LETRAS",
    contexto: "FERRAMENTA",
    acao: { tipo: "ir" as const, href: "/apps/texto" },
    peso: 1,
  },
  {
    chave: "t:contador",
    titulo: "CONTADOR",
    contexto: "FERRAMENTA",
    acao: { tipo: "ir" as const, href: "/apps/contador" },
    peso: 1,
  },
];

function pontuar(alvo: { titulo: string; contexto: string }, termo: string): number {
  if (alvo.titulo.startsWith(termo)) return 3;
  if (alvo.titulo.includes(termo)) return 2;
  if (alvo.contexto.includes(termo)) return 1;
  return 0;
}

export function PaletaComandos({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const [termo, setTermo] = useState("");
  const [selecionado, setSelecionado] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const textos = useTextos();

  /**
   * Índice pré-normalizado. Refeito só quando os textos mudam — não a cada
   * tecla, que é o caminho quente da busca.
   */
  const indice = useMemo(() => {
    const itens: Resultado[] = [
      ...textos.map((s) => ({
        chave: `s:${s.id}`,
        titulo: s.nome,
        contexto: LABEL_CATEGORIA[s.categoria] ?? s.categoria,
        acao: { tipo: "copiar" as const, texto: s.texto },
        peso: 0,
      })),
      ...FERRAMENTAS,
    ];
    return itens.map((i) => ({
      item: i,
      titulo: normalizar(i.titulo),
      contexto: normalizar(i.contexto),
    }));
  }, [textos]);

  const resultados = useMemo(() => {
    const t = normalizar(termo.trim());
    // Sem termo: mostra as ferramentas, que é o menu mais curto.
    if (!t) return FERRAMENTAS;

    return indice
      .map((e) => ({ item: e.item, p: pontuar(e, t) }))
      .filter((e) => e.p > 0)
      .sort((a, b) => b.p - a.p || a.item.titulo.localeCompare(b.item.titulo))
      .slice(0, 60)
      .map((e) => e.item);
  }, [termo, indice]);

  useEffect(() => setSelecionado(0), [termo]);

  useEffect(() => {
    if (aberta) {
      setTermo("");
      setSelecionado(0);
      // O autofocus precisa esperar o elemento existir no DOM.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [aberta]);

  // Mantém o item selecionado visível quando se navega pelo teclado.
  useEffect(() => {
    listaRef.current?.children[selecionado]?.scrollIntoView({ block: "nearest" });
  }, [selecionado]);

  if (!aberta) return null;

  async function acionar(r: Resultado) {
    if (r.acao.tipo === "copiar") {
      const ok = await copiar(r.acao.texto);
      avisarCopia(r.titulo, ok);
    } else {
      router.push(r.acao.href);
    }
    aoFechar();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      // Sem isto o Esc chega ao handler global da Moldura e, além de fechar
      // a paleta, joga você de volta no menu — perdendo a tela onde estava.
      e.stopPropagation();
      aoFechar();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelecionado((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelecionado((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && resultados[selecionado]) {
      e.preventDefault();
      void acionar(resultados[selecionado]);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[10vh]"
      onClick={aoFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar"
        className="flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-edge bg-panel shadow-painel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-edge px-4">
          <span className="text-inkDim/60">
            <IconeBusca tamanho={16} />
          </span>
          {/*
            `foco-obvio` tira o anel de foco — veja o porquê em globals.css.
            Aqui ele não dizia nada: este campo é o único focável do diálogo,
            é focado sozinho ao abrir e já tem o cursor piscando. E, por
            encostar no topo de uma caixa que recorta as bordas, ainda
            aparecia cortado em cima.
          */}
          <input
            ref={inputRef}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar texto, CID, fármaco, calculadora…"
            aria-label="Buscar"
            className="foco-obvio w-full bg-transparent py-2.5 text-sm text-ink placeholder:text-inkDim/60"
          />
        </div>

        <ul ref={listaRef} className="min-h-0 flex-1 overflow-y-auto py-1">
          {resultados.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-inkDim">Nada encontrado.</li>
          )}
          {resultados.map((r, i) => (
            <li key={r.chave}>
              <button
                onClick={() => void acionar(r)}
                onMouseEnter={() => setSelecionado(i)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left ${
                  i === selecionado ? "bg-accent/15" : ""
                }`}
                style={i === selecionado ? { boxShadow: "inset 2px 0 0 rgb(var(--accent))" } : undefined}
              >
                <span className="truncate text-[13px] font-semibold text-ink">{r.titulo}</span>
                <span className="shrink-0 font-mono text-[10px] uppercase text-inkDim">{r.contexto}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-4 border-t border-edge bg-base/50 px-4 py-2 font-mono text-[10px] text-inkDim">
          <span>↑↓ navegar</span>
          <span>↵ copiar / abrir</span>
          <span>esc fechar</span>
          <span className="ml-auto">{resultados.length} resultado(s)</span>
        </div>
      </div>
    </div>
  );
}
