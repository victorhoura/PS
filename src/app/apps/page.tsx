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
    <div className="p-3 sm:p-4 lg:px-7 lg:py-6">
      <h1 className="mb-4 titulo-pagina">APLICATIVOS</h1>

      <Secao titulo="Escores">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {CALCULADORAS.map((c) => (
            <Cartao key={c.slug} href={`/apps/${c.slug}`} nome={c.nome} nota={c.subtitulo} />
          ))}
        </div>
      </Secao>

      <Secao titulo="Ferramentas">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {FERRAMENTAS.map((f) => (
            <Cartao key={f.href} href={f.href} nome={f.nome} nota={f.nota} />
          ))}
        </div>
      </Secao>

      <Secao titulo="Ferramenta de apoio">
        <p className="max-w-2xl text-[11px] leading-relaxed text-inkDim">
          Escores e calculadoras servem de auxílio à decisão, não a substituem. A conduta é
          sempre médica: confira o resultado com o quadro clínico e com o protocolo do serviço.
        </p>
      </Secao>
    </div>
  );
}
