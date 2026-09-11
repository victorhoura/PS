"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORIAS } from "@/data/snippets";
import { PaletaComandos } from "./PaletaComandos";
import { AvisoCopia } from "./AvisoCopia";
import { RegistrarSW } from "./RegistrarSW";

export function Moldura({ children }: { children: React.ReactNode }) {
  const [paletaAberta, setPaletaAberta] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ctrl+K / Cmd+K abre a busca global de qualquer lugar.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletaAberta((v) => !v);
        return;
      }
      // ESC volta ao menu, como no app original — mas só se a paleta
      // estiver fechada (senão ela mesma trata o ESC).
      if (e.key === "Escape" && !paletaAberta && pathname !== "/") {
        router.push("/");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletaAberta, pathname, router]);

  // A tela de entrada é anterior ao app: sem barra lateral, sem paleta.
  if (pathname === "/entrar") return <>{children}</>;

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <RegistrarSW />

      <aside className="shrink-0 border-b border-edge bg-panel lg:h-dvh lg:w-56 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-3 lg:block">
          <Link href="/" className="block">
            <span className="font-mono text-sm font-bold tracking-widest text-accent">PS JAPA</span>
            <span className="ml-2 text-[10px] text-inkDim lg:ml-0 lg:block">PRONTO SOCORRO</span>
          </Link>
          <button
            onClick={() => setPaletaAberta(true)}
            className="transicao rounded border border-edge px-2 py-1 text-[11px] text-inkDim hover:bg-panelHover hover:text-ink lg:mt-3 lg:w-full lg:text-left"
          >
            Buscar <kbd className="ml-1 font-mono text-[10px] text-accent">Ctrl K</kbd>
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:overflow-visible lg:px-2 lg:pb-4">
          {CATEGORIAS.map((c) => {
            const href = `/c/${c.slug}`;
            const ativo = pathname === href;
            return (
              <Link
                key={c.slug}
                href={href}
                className={`transicao flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded px-3 py-1.5 text-[11px] font-semibold tracking-wide ${
                  ativo ? "bg-accent text-accentInk" : "text-inkDim hover:bg-panelHover hover:text-ink"
                }`}
              >
                {c.label}
                <span className={`font-mono text-[10px] ${ativo ? "text-accentInk/70" : "text-inkDim/60"}`}>
                  {c.total}
                </span>
              </Link>
            );
          })}

          <div className="hidden h-px bg-edge lg:my-2 lg:block" />

          <Link
            href="/apps"
            className={`transicao flex shrink-0 whitespace-nowrap rounded px-3 py-1.5 text-[11px] font-semibold tracking-wide ${
              pathname.startsWith("/apps") ? "bg-accent text-accentInk" : "text-inkDim hover:bg-panelHover hover:text-ink"
            }`}
          >
            APLICATIVOS
          </Link>
          <Link
            href="/links"
            className={`transicao flex shrink-0 whitespace-nowrap rounded px-3 py-1.5 text-[11px] font-semibold tracking-wide ${
              pathname === "/links" ? "bg-accent text-accentInk" : "text-inkDim hover:bg-panelHover hover:text-ink"
            }`}
          >
            LINKS
          </Link>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 lg:h-dvh lg:overflow-y-auto">{children}</main>

      <PaletaComandos aberta={paletaAberta} aoFechar={() => setPaletaAberta(false)} />
      <AvisoCopia />
    </div>
  );
}
