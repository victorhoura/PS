import type { Config } from "tailwindcss";

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
        painel: "0 12px 32px -12px rgb(var(--sombra) / 0.45)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
