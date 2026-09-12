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
    <section className="mb-8">
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
    <div className="p-4 lg:p-6">
      <h1 className="mb-6 font-mono text-base font-bold tracking-[0.16em] text-ink">LINKS</h1>

      <Grupo titulo="SISTEMAS DO HOSPITAL" itens={SISTEMA} />
      <Grupo titulo="CONSULTA" itens={CONSULTA} />

      <Cofre />

      <div className="mt-6 max-w-2xl rounded-lg border border-warn/40 bg-warn/10 p-4">
        <h2 className="mb-1.5 text-[11px] font-bold tracking-widest text-warn">
          O QUE O COFRE NÃO RESOLVE
        </h2>
        <ul className="space-y-1.5 text-[11px] leading-relaxed text-inkDim">
          <li>
            • Guardar o cartão de chave dinâmica junto da senha enfraquece o segundo fator:
            os dois passam a depender da mesma senha-mestra. Se puder, deixe o cartão no papel.
          </li>
          <li>
            • O cofre vive só neste navegador. Limpar dados do navegador apaga o cofre, e ele
            não acompanha você para outro computador.
          </li>
          <li>
            • Confira a política do hospital: guardar credencial do prontuário em software
            próprio pode contrariar o termo que você assinou.
          </li>
        </ul>
      </div>
    </div>
  );
}
