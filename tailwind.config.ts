import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta "cyborg" do app original, recalibrada para contraste AA.
        base: "#0d0f12",
        panel: "#16191e",
        panelHover: "#1f242b",
        edge: "#2b313a",
        ink: "#e8eaed",
        inkDim: "#9aa3ae",
        accent: "#2fb5d9",
        accentInk: "#06222b",
        warn: "#e0a030",
        danger: "#e05252",
        ok: "#3fb37f",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
