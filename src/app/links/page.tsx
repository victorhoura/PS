import { Cartao, Secao } from "@/components/Cartao";
import { Cofre } from "@/components/Cofre";

const SISTEMA = [
  { nome: "SISS — HOSPITAL GUARULHOS", url: "https://hospitalarguarulhos.sissonline.com.br/Abertura/Login.aspx" },
  { nome: "SHIFT / AFIP — LABORATÓRIO", url: "https://shiftlis.afip.com.br/shift/lis/afip/elis/s01.iu.web.Login.cls?config=UNICO" },
  { nome: "ONE LAUDOS — MOBILEMED", url: "https://onelaudos.mobilemed.com.br/exames" },
  { nome: "SINCONECTA", url: "https://app.sinconecta.com/ords/f?p=1500:LOGIN_DESKTOP" },
];

const CONSULTA = [
  { nome: "WHITEBOOK", url: "https://whitebook.pebmed.com.br/login/" },
];

function Grupo({ titulo, itens }: { titulo: string; itens: { nome: string; url: string }[] }) {
  return (
    <Secao titulo={titulo}>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {itens.map((l) => (
          <Cartao
            key={l.url}
            href={l.url}
            nome={l.nome}
            // O endereço fica: numa máquina do hospital, é o que diz se o
            // link leva ao sistema certo antes de você digitar a senha nele.
            nota={new URL(l.url).hostname}
            notaMono
            externo
          />
        ))}
      </div>
    </Secao>
  );
}

export default function Links() {
  return (
    <div className="p-3 lg:p-4">
      <h1 className="mb-4 font-mono text-base font-bold tracking-[0.16em] text-ink">LINKS</h1>

      <Grupo titulo="Sistemas do hospital" itens={SISTEMA} />
      <Grupo titulo="Consulta" itens={CONSULTA} />

      <Cofre />
    </div>
  );
}
