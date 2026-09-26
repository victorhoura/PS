/**
 * A marca do PS JAPA: cruz partida em duas cores com o traçado de ECG
 * atravessando.
 *
 * Os contornos são os do arquivo original, vetorizados — não uma releitura à
 * mão. O caminho branco não é decoração: o ECG é um vazado entre as duas
 * metades, e sem um fundo por baixo ele mostraria o que estiver atrás. Ficava
 * branco na tela clara e preto na escura; com o fundo, a linha é branca
 * sempre, como na marca.
 *
 * Não herda currentColor de propósito. As três cores são a identidade, e num
 * lugar só — o resto do app usa Icones.tsx para ícone de interface.
 */

import { COR_FUNDO, COR_NAVY, COR_TEAL, FUNDO, NAVY, TEAL } from "@/lib/marca";

export function Logo({ tamanho = 20, className = "" }: { tamanho?: number; className?: string }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="97 100 1058 1058"
      role="img"
      aria-label="PS JAPA"
      className={className}
    >
      {/* O potrace devolve décimos de pixel com o eixo Y invertido. */}
      <g transform="translate(0,1254) scale(0.1,-0.1)">
        <path fill={COR_FUNDO} d={FUNDO} />
        <path fill={COR_NAVY} d={NAVY} />
        <path fill={COR_TEAL} d={TEAL} />
      </g>
    </svg>
  );
}
