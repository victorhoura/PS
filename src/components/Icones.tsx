/**
 * Ícones em SVG, traço de 1.75 e 16px por padrão, herdando currentColor.
 *
 * Antes eram glifos de texto (☰ ✕ ✎ ▼): cada fonte desenhava de um jeito,
 * o alinhamento vertical variava e o peso não combinava com o resto. SVG
 * dá o mesmo desenho em qualquer máquina do hospital.
 */

type Props = { className?: string; tamanho?: number };

function Svg({
  children,
  className = "",
  tamanho = 16,
}: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export const IconeMenu = (p: Props) => (
  <Svg {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </Svg>
);

export const IconeFechar = (p: Props) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const IconeBusca = (p: Props) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);

export const IconeEditar = (p: Props) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Svg>
);

export const IconeMais = (p: Props) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconeSeta = ({ aberto, ...p }: Props & { aberto?: boolean }) => (
  <Svg {...p}>
    <path d={aberto ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
  </Svg>
);

export const IconeCadeado = (p: Props) => (
  <Svg {...p}>
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Svg>
);

export const IconeSol = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);

export const IconeLua = (p: Props) => (
  <Svg {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </Svg>
);

export const IconeCopiar = (p: Props) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </Svg>
);

export const IconeCheck = (p: Props) => (
  <Svg {...p}>
    <path d="m4 12 5.5 5.5L20 7" />
  </Svg>
);

/**
 * Engrenagem.
 *
 * O contorno é o da peça inteira, com os oito dentes fechados no caminho.
 * Dentes soltos em volta de um círculo — que é o desenho mais fácil — dão um
 * SOL, e o sol é o ícone do tema, logo ao lado deste no rodapé.
 */
export const IconeEngrenagem = (p: Props) => (
  <Svg {...p}>
    <path d="M 20.96 9.93 L 20.96 14.07 L 18.11 14.22 L 17.89 14.75 L 19.80 16.88 L 16.88 19.80 L 14.75 17.89 L 14.22 18.11 L 14.07 20.96 L 9.93 20.96 L 9.78 18.11 L 9.25 17.89 L 7.12 19.80 L 4.20 16.88 L 6.11 14.75 L 5.89 14.22 L 3.04 14.07 L 3.04 9.93 L 5.89 9.78 L 6.11 9.25 L 4.20 7.12 L 7.12 4.20 L 9.25 6.11 L 9.78 5.89 L 9.93 3.04 L 14.07 3.04 L 14.22 5.89 L 14.75 6.11 L 16.88 4.20 L 19.80 7.12 L 17.89 9.25 L 18.11 9.78 Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
