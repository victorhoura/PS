"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIAS } from "@/data/snippets";

/**
 * A lista vertical de destinos, em duas densidades:
 *
 *  - "lateral": a barra fixa do desktop, compacta, sempre visível;
 *  - "cheia": o menu que toma a janela inteira quando ela é estreita —
 *    aí sobra largura, e a linha pode ser alta o bastante para acertar
 *    com pressa, como os botões do PS.py.
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
      cheia ? "px-4 py-3 text-[13px]" : "px-3 py-1.5 text-[11px]",
      ativo
        ? "bg-accent text-accentInk"
        : "text-inkDim hover:bg-panelHover hover:text-ink",
    ].join(" ");

  const contador = (ativo: boolean) =>
    `tabular shrink-0 font-mono ${cheia ? "text-[11px]" : "text-[10px]"} ${
      ativo ? "text-accentInk/75" : "text-inkDim/60"
    }`;

  const grupo = (titulo: string) => (
    <p
      className={`px-3 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim/50 ${
        cheia ? "mb-1.5 mt-4" : "mb-1 mt-3"
      }`}
    >
      {titulo}
    </p>
  );

  return (
    <nav className={`flex flex-col ${cheia ? "gap-0.5 px-3 pb-6" : "gap-px px-2 pb-4"}`}>
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
