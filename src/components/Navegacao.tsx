"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIAS } from "@/data/snippets";

/**
 * A lista vertical de destinos, em duas formas:
 *
 *  - "lateral": a barra fixa do desktop, compacta, sempre visível;
 *  - "cheia": o menu que toma a janela inteira quando ela é estreita — e a
 *    própria tela inicial, que é este mesmo menu.
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
  /** null enquanto os seus textos carregam: sem número, em vez do da base. */
  totais: Record<string, number> | null;
  variante?: "lateral" | "cheia";
  aoNavegar?: () => void;
}) {
  const pathname = usePathname();
  const cheia = variante === "cheia";

  /*
   * Item ativo em tom do acento sobre fundo levemente tingido, e não mais o
   * bloco sólido: marca onde você está sem gritar, e o menu inteiro fica
   * mais leve — que é o que se vê o tempo todo no plantão.
   */
  const item = (ativo: boolean) =>
    [
      "transicao flex items-center justify-between gap-2 rounded-lg",
      cheia ? "linha-menu" : "px-3 py-[7px] text-[12px] toque:py-[11px]",
      ativo
        ? "bg-accent/[0.13] font-semibold text-accent"
        : "font-medium text-ink/75 hover:bg-panelHover hover:text-ink",
    ].join(" ");

  const contador = (ativo: boolean) =>
    `tabular shrink-0 text-[11px] font-medium ${
      ativo ? "text-accent/80" : "text-inkDim/70"
    }`;

  const grupo = (titulo: string) => (
    <p className="mb-1 mt-4 px-3 rotulo text-inkDim/60 first:mt-2">
      {titulo}
    </p>
  );

  return (
    <nav aria-label="Menu principal" className={`flex flex-col gap-px pb-4 ${cheia ? "px-2.5" : "px-2"}`}>
      {grupo("Menu principal")}
      {CATEGORIAS.map((c) => {
        const href = `/c/${c.slug}`;
        const ativo = pathname === href;
        return (
          <Link key={c.slug} href={href} onClick={aoNavegar} className={item(ativo)}>
            <span className="truncate">{c.label}</span>
            <span className={contador(ativo)}>{totais ? (totais[c.slug] ?? 0) : ""}</span>
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

      {/*
        CONFIGURAÇÕES não entra nesta lista em nenhuma das duas formas: é a
        engrenagem ao lado do tema e do cadeado — no rodapé da barra lateral e
        na barra de topo da janela estreita. Os itens daqui são o trabalho do
        plantão; SEGURANÇA, BACKUP e DOWNLOAD, lá dentro, são de vez em quando.
      */}
    </nav>
  );
}
