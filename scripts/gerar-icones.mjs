/**
 * Gera os ícones do app rasterizando SVG no Chromium do Playwright.
 *
 * Rodar a partir da raiz do projeto:
 *   node scripts/gerar-icones.mjs
 *
 * Grava os PNGs no diretório atual; copie para public/ depois de conferir.
 * Não é parte do build — os ícones vivem versionados em public/.
 */
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

const CIANO = "#2fb5d9";
const BRANCO = "#f2fbfd";

/** ECG contido na barra horizontal da cruz: uma linha de base, um pico, uma queda. */
const pulso = (x0, x1, y, amp) =>
  `M${x0} ${y} H${x0 + 76} L${x0 + 96} ${y - amp * 0.42} L${x0 + 122} ${y + amp} ` +
  `L${x0 + 148} ${y - amp * 1.15} L${x0 + 172} ${y} H${x1}`;

function svg({ escala = 1, sangra = false, traco = 16 }) {
  // No maskable o conteúdo encolhe para a zona segura (80% central) e o fundo
  // vai de ponta a ponta, porque o sistema aplica a própria máscara.
  const c = 256;
  const k = escala;
  const braco = 152 * k;
  const esp = 84 * k;
  const t = traco * k;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#161d26"/><stop offset="1" stop-color="#080a0d"/>
    </linearGradient>
  </defs>
  ${
    sangra
      ? `<rect width="512" height="512" fill="url(#g)"/>`
      : `<rect width="512" height="512" rx="114" fill="url(#g)"/>
         <rect x="1.5" y="1.5" width="509" height="509" rx="112.5" fill="none"
               stroke="${CIANO}" stroke-opacity=".22" stroke-width="3"/>`
  }
  <g>
    <rect x="${c - esp / 2}" y="${c - braco}" width="${esp}" height="${braco * 2}" rx="${esp / 2}" fill="${CIANO}"/>
    <rect x="${c - braco}" y="${c - esp / 2}" width="${braco * 2}" height="${esp}" rx="${esp / 2}" fill="${CIANO}"/>
    <path d="${pulso(c - braco + 24 * k, c + braco - 24 * k, c, 46 * k)}"
          fill="none" stroke="${BRANCO}" stroke-width="${t}"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

const normal = svg({});
const maskable = svg({ escala: 0.76, sangra: true, traco: 18 });
writeFileSync("final-normal.svg", normal);
writeFileSync("final-maskable.svg", maskable);

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });

async function rasteriza(conteudo, arquivo, tamanho, fundo) {
  await p.setViewportSize({ width: tamanho, height: tamanho });
  await p.setContent(
    `<body style="margin:0;width:${tamanho}px;height:${tamanho}px">
       ${conteudo.replace('width="512" height="512"', `width="${tamanho}" height="${tamanho}"`)}
     </body>`,
    { waitUntil: "load" },
  );
  await p.screenshot({ path: arquivo, omitBackground: !fundo });
}

await rasteriza(normal, "final-512.png", 512, false);
await rasteriza(normal, "final-192.png", 192, false);
await rasteriza(maskable, "final-maskable.png", 512, true);
await rasteriza(maskable, "final-apple.png", 180, true);

// tira de conferência
const d = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
const n = d("final-512.png"), m = d("final-maskable.png");
await p.setViewportSize({ width: 760, height: 360 });
await p.setContent(
  `<body style="margin:0;background:#2a2d31;padding:20px;display:flex;flex-direction:column;gap:20px">
     <div style="display:flex;gap:16px;align-items:center">
       ${[160, 96, 64, 40, 28, 20].map((t) => `<img src="${n}" width="${t}" height="${t}">`).join("")}
     </div>
     <div style="display:flex;gap:16px;align-items:center;background:#e8eaed;padding:12px;border-radius:12px;width:max-content">
       ${[96, 64, 40, 28, 20].map((t) => `<img src="${n}" width="${t}" height="${t}" style="display:block">`).join("")}
     </div>
     <div style="display:flex;gap:16px;align-items:center">
       <span style="font:600 11px monospace;color:#9aa3ae">maskable</span>
       ${[96, 64, 40].map((t) => `<img src="${m}" width="${t}" height="${t}" style="border-radius:50%">`).join("")}
       ${[96, 64].map((t) => `<img src="${m}" width="${t}" height="${t}" style="border-radius:22%">`).join("")}
     </div>
   </body>`,
  { waitUntil: "load" },
);
await p.waitForTimeout(250);
await p.screenshot({ path: "final-tira.png", fullPage: true });
console.log("icones finais gerados");
await b.close();
