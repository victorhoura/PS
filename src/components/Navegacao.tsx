"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIAS } from "@/data/snippets";

/**
 * A lista vertical de destinos, em duas formas:
 *
 *  - "lateral": a barra fixa do desktop, compacta, sempre visível;
 *  - "cheia": o menu que toma a janela inteira quando ela é estreita.
 *
 * A altura da linha da "cheia" mora no CSS (`.linha-menu`), não aqui, porque
 * ela depende do PONTEIRO e não da largura: a mesma janela estreita é um
 * painel lateral do Chrome apontado por mouse — onde altura é o que falta —
 * ou um celular apontado por dedo, onde alvo pequeno vira erro de toque.
 */
export function Navegacao({
  totais,
  variante = "lateral",
  aoNavegar,
}: {
  totais: Record<string, number>;
  variante?: "lateral" | "cheia";
  aoNavegar?: () => void;
}) {
  const pathname = usePathname();
  const cheia = variante === "cheia";

  const item = (ativo: boolean) =>
    [
      "transicao flex items-center justify-between gap-2 rounded-md font-semibold tracking-wide",
      cheia ? "linha-menu" : "px-3 py-1.5 text-[11px]",
      ativo
        ? "bg-accent text-accentInk"
        : "text-inkDim hover:bg-panelHover hover:text-ink",
    ].join(" ");

  const contador = (ativo: boolean) =>
    `tabular shrink-0 font-mono text-[10px] ${
      ativo ? "text-accentInk/75" : "text-inkDim/60"
    }`;

  const grupo = (titulo: string) => (
    <p className="mb-1 mt-3 px-3 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim/50">
      {titulo}
    </p>
  );

  return (
    <nav className={`flex flex-col gap-px pb-4 ${cheia ? "px-2.5" : "px-2"}`}>
      {grupo("Textos")}
      {CATEGORIAS.map((c) => {
        const href = `/c/${c.slug}`;
        const ativo = pathname === href;
        return (
          <Link key={c.slug} href={href} onClick={aoNavegar} className={item(ativo)}>
            <span className="truncate">{c.label}</span>
            <span className={contador(ativo)}>{totais[c.slug] ?? c.total}</span>
          </Link>
        );
      })}

      {grupo("Ferramentas")}
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
