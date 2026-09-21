import { CALCULADORAS } from "@/lib/calculadoras";
import { Cartao, Secao } from "@/components/Cartao";

const FERRAMENTAS = [
  { href: "/apps/apac", nome: "GERADOR DE APAC", nota: "preenche o laudo oficial e devolve o PDF" },
  { href: "/apps/sadt", nome: "GERADOR DE SADT", nota: "requisição de exames do HMU, pronta para imprimir" },
  { href: "/apps/labs", nome: "FORMATADOR DE EXAMES", nota: "laudo do SHIFT vira linha de prontuário" },
  { href: "/apps/texto", nome: "CONVERSOR DE LETRAS", nota: "maiúsculas, minúsculas, primeira letra" },
  { href: "/apps/contador", nome: "CONTADOR", nota: "contagem de atendimentos do plantão" },
];

/**
 * Esta é a página de catálogo: aqui cada escore vem com a descrição, que é o
 * que distingue um de outro quando são vinte. A tela inicial só lista os
 * nomes, e manda para cá quem precisa saber o que cada um faz.
 */
export default function Apps() {
  return (
    <div className="p-3 lg:p-4">
      <h1 className="mb-4 font-mono text-base font-bold tracking-[0.16em] text-ink">APLICATIVOS</h1>

      <Secao titulo="Escores">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {CALCULADORAS.map((c) => (
            <Cartao key={c.slug} href={`/apps/${c.slug}`} nome={c.nome} nota={c.subtitulo} />
          ))}
        </div>
      </Secao>

      <Secao titulo="Ferramentas">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {FERRAMENTAS.map((f) => (
            <Cartao key={f.href} href={f.href} nome={f.nome} nota={f.nota} />
          ))}
        </div>
      </Secao>

      <Secao titulo="Confira antes de confiar">
        <p className="max-w-2xl text-[11px] leading-relaxed text-inkDim">
          Todos os escores do PS.py já estão aqui. O que era cálculo virou cálculo, o que era
          conduta virou texto — mas o valor que sai não substitui o seu julgamento, e vale
          conferir cada um contra o programa antigo antes de usar no plantão.
        </p>
      </Secao>
    </div>
  );
}
