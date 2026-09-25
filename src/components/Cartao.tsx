import Link from "next/link";

/**
 * O cartão de destino — a peça repetida no início, em APLICATIVOS e em LINKS.
 *
 * Mora aqui, e não copiado em cada página, porque a densidade é uma decisão
 * só. O app é usado no painel lateral do Chrome, com uns 300px de largura, e
 * ali cada linha a mais em CADA item é uma rolagem a mais na página inteira.
 *
 * Duas formas:
 *
 *  - com `valor`: uma linha só, nome à esquerda e o número à direita. É o
 *    caso de "ANAMNESE / 7 itens", em que a segunda linha gastava a altura
 *    de um item para dizer um número;
 *  - com `nota`: duas linhas, para quando a segunda diz o que o nome não diz
 *    ("Probabilidade pré-teste de tromboembolismo pulmonar").
 *
 * A nota vai truncada, e não quebrando em três linhas: assim os cartões da
 * grade têm todos a mesma altura, e o texto inteiro continua no `title`.
 *
 * A moldura não é dele: vem da `.colecao` onde ele mora (globals.css) — uma
 * caixa com divisórias na janela estreita, cartões soltos na larga.
 */
export function Cartao({
  href,
  nome,
  valor,
  nota,
  notaMono = false,
  externo = false,
}: {
  href: string;
  nome: string;
  /** Vai à direita, na mesma linha — número ou coisa curta. */
  valor?: string | number;
  /** Segunda linha. */
  nota?: string;
  /** Nota em fonte de máquina: endereço de site. */
  notaMono?: boolean;
  /** Link para fora do app: abre em outra aba. */
  externo?: boolean;
}) {
  const caixa =
    "transicao block min-w-0 px-3 py-2 hover:bg-panelHover sm:hover:border-accent/50";

  const miolo = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-[12px] font-semibold text-ink">{nome}</span>
        {valor !== undefined && (
          <span className="tabular ml-auto shrink-0 text-[11px] font-medium text-inkDim">
            {valor}
          </span>
        )}
      </span>
      {nota && (
        <span
          className={`mt-0.5 block truncate leading-snug text-inkDim ${
            notaMono ? "font-mono text-[10px]" : "text-[11px]"
          }`}
        >
          {nota}
        </span>
      )}
    </>
  );

  if (externo) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={nota}
        className={caixa}
      >
        {miolo}
      </a>
    );
  }

  return (
    <Link href={href} title={nota} className={caixa}>
      {miolo}
    </Link>
  );
}

/** Título de seção e o que vem embaixo dele, com o mesmo respiro em todo lugar. */
export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 rotulo">
        {titulo}
      </h2>
      {children}
    </section>
  );
}
