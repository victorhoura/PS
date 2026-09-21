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
    <section className="mb-6">
      <h2 className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim/70">{titulo}</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {itens.map((l) => (
          <a
            key={l.url}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="transicao rounded-lg border border-edge bg-panel p-3 hover:border-accent/60 hover:bg-panelHover"
          >
            <span className="block text-[12px] font-bold tracking-wide text-ink">{l.nome}</span>
            <span className="mt-1 block truncate font-mono text-[10px] text-inkDim">
              {new URL(l.url).hostname}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function Links() {
  return (
    <div className="p-3 lg:p-4">
      <h1 className="mb-6 font-mono text-base font-bold tracking-[0.16em] text-ink">LINKS</h1>

      <Grupo titulo="SISTEMAS DO HOSPITAL" itens={SISTEMA} />
      <Grupo titulo="CONSULTA" itens={CONSULTA} />

      <Cofre />

    </div>
  );
}
