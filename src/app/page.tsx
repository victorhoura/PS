import Link from "next/link";
import { CATEGORIAS, SNIPPETS } from "@/data/snippets";
import { CALCULADORAS } from "@/lib/calculadoras";

const FERRAMENTAS = [
  { href: "/apps/labs", nome: "FORMATADOR DE EXAMES", nota: "cola o laudo do SHIFT, sai a linha pronta" },
  { href: "/apps/texto", nome: "CONVERSOR DE LETRAS", nota: "maiúsculas, minúsculas, primeira letra" },
  { href: "/apps/contador", nome: "CONTADOR", nota: "contagem simples de atendimentos" },
];

export default function Home() {
  return (
    <div className="p-4 lg:p-8">
      <header className="mb-8">
        <h1 className="font-mono text-2xl font-bold tracking-widest text-ink">PS JAPA</h1>
        <p className="mt-1 text-xs text-inkDim">
          {SNIPPETS.length} textos · {CALCULADORAS.length} escores · {FERRAMENTAS.length} ferramentas
        </p>
        <p className="mt-3 max-w-xl text-[11px] leading-relaxed text-inkDim">
          Aperte{" "}
          <kbd className="rounded border border-edge bg-panel px-1.5 py-0.5 font-mono text-accent">Ctrl K</kbd>{" "}
          em qualquer tela para buscar em tudo de uma vez.{" "}
          <kbd className="rounded border border-edge bg-panel px-1.5 py-0.5 font-mono text-accent">Esc</kbd>{" "}
          volta para cá.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[11px] font-bold tracking-widest text-inkDim">TEXTOS</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIAS.map((c) => (
            <Link
              key={c.slug}
              href={`/c/${c.slug}`}
              className="transicao group rounded border border-edge bg-panel p-3 hover:border-accent hover:bg-panelHover"
            >
              <span className="block text-[12px] font-bold tracking-wide text-ink">{c.label}</span>
              <span className="mt-1 block font-mono text-[10px] text-inkDim">{c.total} itens</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[11px] font-bold tracking-widest text-inkDim">ESCORES</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CALCULADORAS.map((c) => (
            <Link
              key={c.slug}
              href={`/apps/${c.slug}`}
              className="transicao rounded border border-edge bg-panel p-3 hover:border-accent hover:bg-panelHover"
            >
              <span className="block text-[12px] font-bold tracking-wide text-ink">{c.nome}</span>
              <span className="mt-1 block text-[10px] leading-snug text-inkDim">{c.subtitulo}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[11px] font-bold tracking-widest text-inkDim">FERRAMENTAS</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FERRAMENTAS.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="transicao rounded border border-edge bg-panel p-3 hover:border-accent hover:bg-panelHover"
            >
              <span className="block text-[12px] font-bold tracking-wide text-ink">{f.nome}</span>
              <span className="mt-1 block text-[10px] leading-snug text-inkDim">{f.nota}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
