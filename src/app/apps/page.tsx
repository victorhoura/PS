import Link from "next/link";
import { CALCULADORAS } from "@/lib/calculadoras";

const FERRAMENTAS = [
  { href: "/apps/labs", nome: "FORMATADOR DE EXAMES", nota: "laudo do SHIFT vira linha de prontuário" },
  { href: "/apps/texto", nome: "CONVERSOR DE LETRAS", nota: "maiúsculas, minúsculas, primeira letra" },
  { href: "/apps/contador", nome: "CONTADOR", nota: "contagem de atendimentos do plantão" },
];

/** Escores que ainda estão no PS.py e entram na próxima leva. */
const PENDENTES = [
  "NIHSS", "CINCINNATI", "SOFA", "WELLS (TEP)", "HINCHEY", "ATLANTA",
  "TOKYO (TG18)", "COLANGITE (CHARCOT/REYNOLDS)", "HIPONATREMIA", "HIPERNATREMIA",
  "HIPOCALEMIA", "HIPERCALEMIA", "PROTOCOLO DE CEFALEIA", "CLASSIFICAÇÃO DE CEFALEIA",
];

export default function Apps() {
  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-6 font-mono text-base font-bold tracking-[0.16em] text-ink">APLICATIVOS</h1>

      <section className="mb-8">
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

      <section className="mb-8">
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
          AINDA NÃO PORTADOS
        </h2>
        <p className="mb-3 max-w-2xl text-[11px] leading-relaxed text-inkDim">
          Continuam funcionando no programa em Python. Entram na próxima leva, depois que você
          testar os de cima num plantão real.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PENDENTES.map((p) => (
            <span
              key={p}
              className="rounded border border-edge/60 px-2 py-1 font-mono text-[10px] text-inkDim/70"
            >
              {p}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
