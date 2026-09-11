/**
 * Carimba uma versão nova no service worker a cada build, senão o navegador
 * serve para sempre o cache do deploy anterior.
 */
import { readFileSync, writeFileSync } from "node:fs";

const caminho = "public/sw.js";
const versao = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const sw = readFileSync(caminho, "utf-8").replace(
  /const VERSAO = "[^"]*";/,
  `const VERSAO = "${versao}";`,
);
writeFileSync(caminho, sw);
console.log(`sw.js versionado: ${versao}`);
