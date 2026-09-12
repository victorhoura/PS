"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIAS } from "@/data/snippets";

/**
 * A lista vertical de destinos. Mesma marcação na barra lateral do desktop e
 * na gaveta da janela estreita — o menu é o mesmo, só o invólucro muda.
 */
export function Navegacao({
  totais,
  aoNavegar,
}: {
  totais: Record<string, number>;
  aoNavegar?: () => void;
}) {
  const pathname = usePathname();

  const item = (ativo: boolean) =>
    `transicao flex items-center justify-between gap-2 rounded px-3 py-2 text-[11px] font-semibold tracking-wide ${
      ativo ? "bg-accent text-accentInk" : "text-inkDim hover:bg-panelHover hover:text-ink"
    }`;

  return (
    <nav className="flex flex-col gap-0.5 px-2 pb-4">
      {CATEGORIAS.map((c) => {
        const href = `/c/${c.slug}`;
        const ativo = pathname === href;
        return (
          <Link key={c.slug} href={href} onClick={aoNavegar} className={item(ativo)}>
            <span className="truncate">{c.label}</span>
            <span
              className={`shrink-0 font-mono text-[10px] ${
                ativo ? "text-accentInk/70" : "text-inkDim/60"
              }`}
            >
              {totais[c.slug] ?? c.total}
            </span>
          </Link>
        );
      })}

      <div className="my-2 h-px bg-edge" />

      <Link href="/apps" onClick={aoNavegar} className={item(pathname.startsWith("/apps"))}>
        APLICATIVOS
      </Link>
      <Link href="/links" onClick={aoNavegar} className={item(pathname === "/links")}>
        LINKS
      </Link>
      <Link href="/backup" onClick={aoNavegar} className={item(pathname === "/backup")}>
        BACKUP
      </Link>
    </nav>
  );
}
