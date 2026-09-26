import { CALCULADORAS } from "@/lib/calculadoras";
import { Cartao, Secao } from "@/components/Cartao";

/**
 * ESCORES / CALCULADORAS: o catálogo, cada um com a descrição — é o que
 * distingue um do outro quando são vinte. Já morou dentro de APLICATIVOS,
 * misturado às ferramentas; escore é consulta do atendimento, ferramenta é
 * papel e rotina, e cada um ganhou o seu lugar no menu.
 */
export default function Escores() {
  return (
    <div className="pagina">
      <h1 className="mb-4 titulo-pagina">ESCORES / CALCULADORAS</h1>

      <div className="colecao mb-6 sm:grid-cols-2 lg:grid-cols-3">
        {CALCULADORAS.map((c) => (
          <Cartao key={c.slug} href={`/escores/${c.slug}`} nome={c.nome} nota={c.subtitulo} />
        ))}
      </div>

      <Secao titulo="Ferramenta de apoio">
        <p className="subtitulo mt-0">
          Escores e calculadoras servem de auxílio à decisão, não a substituem. A conduta é
          sempre médica: confira o resultado com o quadro clínico e com o protocolo do serviço.
        </p>
      </Secao>
    </div>
  );
}
