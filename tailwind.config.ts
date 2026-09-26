import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

/** Lê a variável CSS mantendo os modificadores de opacidade do Tailwind. */
const cor = (nome: string) => `rgb(var(--${nome}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: cor("base"),
        panel: cor("panel"),
        panelHover: cor("panel-hover"),
        edge: cor("edge"),
        ink: cor("ink"),
        inkDim: cor("ink-dim"),
        accent: cor("accent"),
        accentInk: cor("accent-ink"),
        warn: cor("warn"),
        danger: cor("danger"),
        ok: cor("ok"),
      },
      boxShadow: {
        painel: "0 24px 48px -16px rgb(var(--sombra) / 0.5), 0 0 0 1px rgb(var(--edge) / 0.6)",
        cartao: "0 1px 2px rgb(var(--sombra) / 0.06)",
      },
      fontFamily: {
        // Inter, servida pelo próprio app (src/app/fontes): a mesma letra em
        // qualquer máquina, sem depender do que o computador do hospital tem.
        sans: ["var(--fonte-sans)", "ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Cascadia Mono", "Consolas", "monospace"],
      },
      /*
       * Espaçamento de letra mais contido que o padrão. O app herdou do PS.py
       * rótulos em caixa-alta bem espaçados, com cara de terminal; com a
       * Inter, espaço de menos lê melhor e parece mais atual. Ajustar aqui
       * atinge de uma vez todo `tracking-wide/wider/widest` do código.
       */
      letterSpacing: {
        wide: "0.01em",
        wider: "0.03em",
        widest: "0.06em",
      },
      // Negrito um degrau abaixo do 700: a Inter é variável, e 650 em
      // caixa-alta pesa menos na tela sem perder a hierarquia.
      fontWeight: {
        bold: "650",
      },
    },
  },
  /*
   * `hover:` só onde existe mouse. No toque o iPhone deixava a linha tocada
   * acesa até o próximo toque em outro lugar, como se ainda houvesse um
   * ponteiro parado em cima dela.
   */
  future: { hoverOnlyWhenSupported: true },
  plugins: [
    /*
     * `toque:` — quando quem aponta é o dedo (celular, tablet). É o mesmo
     * corte do `.linha-menu` em globals.css: pela forma de apontar, e não
     * pela largura, porque o painel lateral do Chrome e o iPhone têm a mesma
     * largura e pedem alturas opostas — o mouse quer linha baixa, o dedo
     * quer alvo de 40px.
     */
    plugin(({ addVariant }) => addVariant("toque", "@media (pointer: coarse)")),
  ],
} satisfies Config;
