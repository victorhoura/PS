import { Cartao } from "@/components/Cartao";

const FERRAMENTAS = [
  { href: "/apps/apac", nome: "GERADOR DE APAC", nota: "preenche o laudo oficial e devolve o PDF" },
  { href: "/apps/sadt", nome: "GERADOR DE SADT", nota: "requisição de exames do HMU, pronta para imprimir" },
  { href: "/apps/labs", nome: "FORMATADOR DE EXAMES", nota: "laudo do SHIFT vira linha de prontuário" },
  { href: "/apps/texto", nome: "CONVERSOR DE LETRAS", nota: "maiúsculas, minúsculas, primeira letra" },
  { href: "/apps/contador", nome: "CONTADOR", nota: "contagem de atendimentos do plantão" },
  { href: "/apps/plantao", nome: "DIVISÃO DE PLANTÃO", nota: "turnos iguais de agora até as 07:00" },
];

/**
 * APLICATIVOS: as ferramentas do plantão, cada uma com o que faz. Os escores
 * moravam aqui também e ganharam seção própria no menu, ESCORES /
 * CALCULADORAS — os endereços antigos deles (/apps/curb-65…) redirecionam.
 */
export default function Apps() {
  return (
    <div className="pagina">
      <h1 className="mb-4 titulo-pagina">APLICATIVOS</h1>

      <div className="colecao sm:grid-cols-2 lg:grid-cols-3">
        {FERRAMENTAS.map((f) => (
          <Cartao key={f.href} href={f.href} nome={f.nome} nota={f.nota} />
        ))}
      </div>
    </div>
  );
}
