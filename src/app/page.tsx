"use client";

import { CATEGORIAS } from "@/data/snippets";
import { CALCULADORAS } from "@/lib/calculadoras";
import { contagens } from "@/lib/repositorio";
import { useTextos } from "@/hooks/useTextos";
import { Cartao, Secao } from "@/components/Cartao";
import { Logo } from "@/components/Logo";

const FERRAMENTAS = [
  { href: "/apps/labs", nome: "FORMATADOR DE EXAMES" },
  { href: "/apps/texto", nome: "CONVERSOR DE LETRAS" },
  { href: "/apps/contador", nome: "CONTADOR" },
];

/**
 * A tela inicial é um índice, não um catálogo: aqui vale só o nome de cada
 * destino. Quem quer saber o que um escore faz abre APLICATIVOS, que existe
 * para isso e traz a descrição de cada um.
 *
 * Com a descrição embaixo de cada nome, esta página tinha quatro telas e meia
 * de rolagem num painel de 300px — e as primeiras duas eram só o caminho até
 * a lista de textos.
 */
export default function Home() {
  const textos = useTextos();
  const totais = contagens(textos);

  const tecla = "rounded border border-edge bg-panel px-1 font-mono text-accent";

  return (
    <div className="p-3 lg:p-4">
      <header className="mb-4">
        <div className="flex items-center gap-2.5">
          <Logo tamanho={22} className="shrink-0" />
          <h1 className="font-mono text-base font-bold tracking-[0.2em] text-ink">JAPA</h1>
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-inkDim">
          <kbd className={tecla}>Ctrl K</kbd> busca em tudo · <kbd className={tecla}>Esc</kbd> volta
          para cá
        </p>
      </header>

      <Secao titulo="Menu principal">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {CATEGORIAS.map((c) => (
            <Cartao
              key={c.slug}
              href={`/c/${c.slug}`}
              nome={c.label}
              valor={totais[c.slug] ?? c.total}
            />
          ))}
        </div>
      </Secao>

      <Secao titulo="Escores">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {CALCULADORAS.map((c) => (
            <Cartao key={c.slug} href={`/apps/${c.slug}`} nome={c.nome} />
          ))}
        </div>
      </Secao>

      <Secao titulo="Ferramentas">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {FERRAMENTAS.map((f) => (
            <Cartao key={f.href} href={f.href} nome={f.nome} />
          ))}
        </div>
      </Secao>
    </div>
  );
}
