import Link from "next/link";
import { CALCULADORAS } from "@/lib/calculadoras";

const FERRAMENTAS = [
  { href: "/apps/apac", nome: "GERADOR DE APAC", nota: "preenche o laudo oficial e devolve o PDF" },
  { href: "/apps/sadt", nome: "GERADOR DE SADT", nota: "requisição de exames do HMU, pronta para imprimir" },
  { href: "/apps/labs", nome: "FORMATADOR DE EXAMES", nota: "laudo do SHIFT vira linha de prontuário" },
  { href: "/apps/texto", nome: "CONVERSOR DE LETRAS", nota: "maiúsculas, minúsculas, primeira letra" },
  { href: "/apps/contador", nome: "CONTADOR", nota: "contagem de atendimentos do plantão" },
];

export default function Apps() {
  return (
    <div className="p-3 lg:p-4">
      <h1 className="mb-6 font-mono text-base font-bold tracking-[0.16em] text-ink">APLICATIVOS</h1>

      <section className="mb-6">
        <h2 className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim/70">ESCORES</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CALCULADORAS.map((c) => (
            <Link
              key={c.slug}
              href={`/apps/${c.slug}`}
              className="transicao rounded-lg border border-edge bg-panel p-3 hover:border-accent/60 hover:bg-panelHover"
            >
              <span className="block text-[12px] font-bold tracking-wide text-ink">{c.nome}</span>
              <span className="mt-1 block text-[10px] leading-snug text-inkDim">{c.subtitulo}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim/70">FERRAMENTAS</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FERRAMENTAS.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="transicao rounded-lg border border-edge bg-panel p-3 hover:border-accent/60 hover:bg-panelHover"
            >
              <span className="block text-[12px] font-bold tracking-wide text-ink">{f.nome}</span>
              <span className="mt-1 block text-[10px] leading-snug text-inkDim">{f.nota}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim/70">
          CONFIRA ANTES DE CONFIAR
        </h2>
        <p className="max-w-2xl text-[11px] leading-relaxed text-inkDim">
          Todos os escores do PS.py já estão aqui. O que era cálculo virou cálculo, o que era
          conduta virou texto — mas o valor que sai não substitui o seu julgamento, e vale
          conferir cada um contra o programa antigo antes de usar no plantão.
        </p>
      </section>
    </div>
  );
}
