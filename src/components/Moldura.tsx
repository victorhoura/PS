"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { contagens } from "@/lib/repositorio";
import { useTextos } from "@/hooks/useTextos";
import { Navegacao } from "./Navegacao";
import { PaletaComandos } from "./PaletaComandos";
import { AvisoCopia } from "./AvisoCopia";
import { RegistrarSW } from "./RegistrarSW";

/**
 * Duas formas para o mesmo app:
 *
 *  - tela larga (>= lg): barra lateral fixa, como um app de desktop;
 *  - janela estreita: barra de topo curta + gaveta vertical.
 *
 * A janela estreita é o caso de plantão — o app encostado na lateral da tela,
 * ao lado do SISS. Por isso nada de faixa horizontal de categorias: ela rola
 * para o lado, esconde metade dos destinos e come altura útil.
 */
export function Moldura({ children }: { children: React.ReactNode }) {
  const [paletaAberta, setPaletaAberta] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Contagem viva: o número ao lado da categoria acompanha o que você cria
  // e apaga, em vez de repetir o total que veio do PS.py.
  const textos = useTextos();
  const totais = contagens(textos);

  // Os listeners globais vivem fora do ciclo de render; leem o estado por ref
  // para não decidir com base num valor de uma renderização anterior.
  const paletaRef = useRef(paletaAberta);
  paletaRef.current = paletaAberta;
  const gavetaRef = useRef(gavetaAberta);
  gavetaRef.current = gavetaAberta;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletaAberta((v) => !v);
        return;
      }
      if (e.key !== "Escape") return;

      // Esc fecha o que estiver por cima antes de navegar: gaveta, depois
      // paleta (que trata o próprio Esc), e só então volta ao menu.
      if (gavetaRef.current) {
        setGavetaAberta(false);
        return;
      }
      if (!paletaRef.current && pathname !== "/") router.push("/");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router]);

  // Trocar de página fecha a gaveta, inclusive quando a navegação veio da
  // paleta ou do botão voltar do navegador.
  useEffect(() => setGavetaAberta(false), [pathname]);

  // A tela de entrada é anterior ao app: sem barra lateral, sem paleta.
  if (pathname === "/entrar") return <>{children}</>;

  const marca = (
    <Link href="/" className="flex min-w-0 items-baseline gap-2">
      <span className="font-mono text-sm font-bold tracking-widest text-accent">PS JAPA</span>
      <span className="truncate text-[10px] text-inkDim">PRONTO SOCORRO</span>
    </Link>
  );

  const botaoBuscar = (
    <button
      onClick={() => setPaletaAberta(true)}
      className="transicao shrink-0 rounded border border-edge px-2 py-1 text-[11px] text-inkDim hover:bg-panelHover hover:text-ink"
    >
      Buscar <kbd className="ml-1 font-mono text-[10px] text-accent">Ctrl K</kbd>
    </button>
  );

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <RegistrarSW />

      {/* ---------- janela estreita: barra de topo ---------- */}
      <header className="flex items-center gap-2 border-b border-edge bg-panel px-2 py-2 lg:hidden">
        <button
          onClick={() => setGavetaAberta(true)}
          aria-label="Abrir menu"
          aria-expanded={gavetaAberta}
          className="transicao shrink-0 rounded border border-edge px-2.5 py-1.5 text-ink hover:bg-panelHover"
        >
          <span aria-hidden className="block text-[13px] leading-none">☰</span>
        </button>
        <div className="min-w-0 flex-1">{marca}</div>
        {botaoBuscar}
      </header>

      {/* ---------- janela estreita: gaveta vertical ---------- */}
      {gavetaAberta && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setGavetaAberta(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="h-full w-60 max-w-[85vw] overflow-y-auto border-r border-edge bg-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-3">
              {marca}
              <button
                onClick={() => setGavetaAberta(false)}
                aria-label="Fechar menu"
                className="transicao shrink-0 rounded px-2 py-1 text-inkDim hover:bg-panelHover hover:text-ink"
              >
                ✕
              </button>
            </div>
            <Navegacao totais={totais} aoNavegar={() => setGavetaAberta(false)} />
          </div>
        </div>
      )}

      {/* ---------- tela larga: barra lateral fixa ---------- */}
      <aside className="hidden shrink-0 border-r border-edge bg-panel lg:block lg:h-dvh lg:w-56 lg:overflow-y-auto">
        <div className="px-4 py-3">
          <Link href="/" className="block">
            <span className="font-mono text-sm font-bold tracking-widest text-accent">PS JAPA</span>
            <span className="block text-[10px] text-inkDim">PRONTO SOCORRO</span>
          </Link>
          <button
            onClick={() => setPaletaAberta(true)}
            className="transicao mt-3 w-full rounded border border-edge px-2 py-1 text-left text-[11px] text-inkDim hover:bg-panelHover hover:text-ink"
          >
            Buscar <kbd className="ml-1 font-mono text-[10px] text-accent">Ctrl K</kbd>
          </button>
        </div>
        <Navegacao totais={totais} />
      </aside>

      <main className="min-w-0 flex-1 lg:h-dvh lg:overflow-y-auto">{children}</main>

      <PaletaComandos aberta={paletaAberta} aoFechar={() => setPaletaAberta(false)} />
      <AvisoCopia />
    </div>
  );
}
