import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  gerarSadt,
  LINHAS_HISTORIA,
  medirHistoria,
  quebrarEmLarguras,
  type DadosSadt,
} from "../sadt";
import type { Medida } from "../pdf";

/** Régua de mentira: cada caractere mede 1pt por ponto de corpo. */
const REGUA: Medida = (texto, tamanho) => texto.length * tamanho;

describe("quebra com largura por linha", () => {
  it("usa a largura da linha em que está", () => {
    // Primeira linha cabe 5pt (5 letras), as seguintes 12.
    expect(quebrarEmLarguras(REGUA, "AA BB CCCC DD", [5, 12], 1)).toEqual(["AA BB", "CCCC DD"]);
  });

  it("repete a última largura nas linhas seguintes", () => {
    expect(quebrarEmLarguras(REGUA, "AAA BBB CCC", [3], 1)).toEqual(["AAA", "BBB", "CCC"]);
  });

  it("palavra maior que a linha fica sozinha, sem travar", () => {
    expect(quebrarEmLarguras(REGUA, "AAAAAA BB", [3], 1)).toEqual(["AAAAAA", "BB"]);
  });

  it("texto vazio não gera linha", () => {
    expect(quebrarEmLarguras(REGUA, "   ", [10], 1)).toEqual([]);
  });
});

describe("história clínica", () => {
  it("cabe em 10pt quando é curta", () => {
    const r = medirHistoria(REGUA, "DOR ABD HA 03 DIAS");
    expect(r.tamanho).toBe(10);
    expect(r.linhas).toEqual(["DOR ABD HA 03 DIAS"]);
    expect(r.sobra).toEqual([]);
  });

  it("encolhe antes de desistir de uma linha", () => {
    // Com a régua de mentira, 10pt cabe ~29 caracteres na primeira linha e
    // ~54 na segunda; em 8pt cabe mais, então o texto passa a caber.
    const texto = "PALAVRA ".repeat(12).trim();
    const r = medirHistoria(REGUA, texto);
    expect(r.linhas.length).toBeLessThanOrEqual(LINHAS_HISTORIA);
    expect(r.tamanho).toBeLessThanOrEqual(10);
  });

  it("devolve o que não coube em vez de cortar em silêncio", () => {
    const r = medirHistoria(REGUA, "PALAVRA ".repeat(80));
    expect(r.linhas).toHaveLength(LINHAS_HISTORIA);
    expect(r.sobra.length).toBeGreaterThan(0);
  });
});

// ------------------------------------------------------------------ PDF

const MODELO = readFileSync("public/SADT.pdf");
const modeloBuffer = () =>
  MODELO.buffer.slice(MODELO.byteOffset, MODELO.byteOffset + MODELO.byteLength) as ArrayBuffer;

/** O exemplo que ele mandou, campo a campo. */
const CASO: DadosSadt = {
  requisitante: "HMU",
  cartaoSus: "123",
  paciente: "CAIO JORGE",
  nascimento: "12/12/2001",
  mae: "JOANA SILVA",
  endereco: "RUA ESTELLA",
  municipio: "GUARULHOS",
  hd: "COLELITIASE",
  cid: "K80",
  historia: "DOR ABD HA 03 DIAS",
  data: "19/09/2026",
  procedimentos: ["US DE ABD TOTAL"],
};

/** Lê do PDF gerado cada texto desenhado com posição e corpo. */
function desenhos(pdf: Uint8Array): [string, number, number, number][] {
  const buf = Buffer.from(pdf);
  const latin = buf.toString("latin1");

  let conteudo = "";
  const streams = /stream\r?\n/g;
  let s: RegExpExecArray | null;
  while ((s = streams.exec(latin))) {
    const ini = s.index + s[0].length;
    try {
      conteudo += inflateSync(buf.subarray(ini, latin.indexOf("endstream", ini))).toString("latin1");
    } catch {
      // stream binário do modelo (o brasão) — não interessa
    }
  }

  const bloco =
    /BT\s[\s\S]{0,200}?\/\S+\s+([\d.]+)\s+Tf[\s\S]{0,120}?1 0 0 1 ([-\d.]+) ([-\d.]+) Tm\s*<([0-9A-Fa-f]*)>\s*Tj/g;
  const saida: [string, number, number, number][] = [];
  let b: RegExpExecArray | null;
  while ((b = bloco.exec(conteudo))) {
    saida.push([Buffer.from(b[4], "hex").toString("latin1"), Number(b[2]), Number(b[3]), Number(b[1])]);
  }
  return saida;
}

describe("modelo em branco", () => {
  it("não carrega dados de paciente nenhum", () => {
    // O PDF que ele mandou vinha com anotações invisíveis de um paciente
    // real. O modelo do app foi remontado sem elas; este teste é a trava.
    const texto = MODELO.toString("latin1");
    expect(texto).not.toContain("/FreeText");
    expect(texto).not.toContain("/Annots");
    for (const resto of ["EDSON", "ANGELO", "MARCONDES", "705009", "ITAPOAN"]) {
      expect(texto).not.toContain(resto);
    }
  });
});

describe("PDF gerado", () => {
  it("escreve cada campo na linha do seu rótulo", async () => {
    const feito = desenhos((await gerarSadt(CASO, modeloBuffer())).pdf);
    const acha = (t: string) => feito.find((o) => o[0] === t);

    // y = linha de base do rótulo impresso naquela linha do formulário.
    const esperado: [string, number, number][] = [
      ["HMU", 67.2, 617.2],
      ["123", 340.0, 564.2],
      ["CAIO JORGE", 67.2, 531.4],
      ["JOANA SILVA", 104.4, 492.5],
      ["RUA ESTELLA", 82.2, 473.1],
      ["GUARULHOS", 150.0, 453.7],
      ["COLELITIASE", 49.4, 417.0],
      ["K80", 374.5, 417.0],
      ["DOR ABD HA 03 DIAS", 123.6, 378.5],
      ["19/09/2026", 454.7, 378.5],
      ["US DE ABD TOTAL", 32.0, 333.9],
    ];

    for (const [texto, x, y] of esperado) {
      const op = acha(texto);
      expect(op, `faltou "${texto}"`).toBeDefined();
      expect(op![1]).toBeCloseTo(x, 1);
      expect(op![2]).toBeCloseTo(y, 1);
    }
  });

  it("quebra a data de nascimento nas três casas do formulário", async () => {
    const feito = desenhos((await gerarSadt(CASO, modeloBuffer())).pdf);
    const naLinha = feito.filter((o) => Math.abs(o[2] - 512.0) < 0.1).map((o) => o[0]);
    expect(naLinha).toEqual(["12", "12", "2001"]);
  });

  it("o ano não encosta na barra que vem antes dele", async () => {
    const feito = desenhos((await gerarSadt(CASO, modeloBuffer())).pdf);
    const ano = feito.find((o) => o[0] === "2001")!;
    // A segunda barra do "____/____/____" termina em 148.25.
    expect(ano[1]).toBeGreaterThan(150);
  });

  it("procedimento vazio não desenha linha nenhuma", async () => {
    const um = desenhos((await gerarSadt(CASO, modeloBuffer())).pdf);
    const tres = desenhos(
      (await gerarSadt({ ...CASO, procedimentos: ["US ABD", "RX TORAX", "TC CRANIO"] }, modeloBuffer())).pdf,
    );
    expect(tres.length).toBe(um.length + 2);
  });

  it("ignora procedimento além das cinco linhas do formulário", async () => {
    const seis = ["A", "B", "C", "D", "E", "F"];
    const feito = desenhos((await gerarSadt({ ...CASO, procedimentos: seis }, modeloBuffer())).pdf);
    expect(feito.some((o) => o[0] === "E")).toBe(true);
    expect(feito.some((o) => o[0] === "F")).toBe(false);
  });

  it("campo opcional em branco não vira texto no PDF", async () => {
    const sem = { ...CASO, cartaoSus: "", mae: "", endereco: "" };
    const feito = desenhos((await gerarSadt(sem, modeloBuffer())).pdf);
    expect(feito.some((o) => o[0] === "")).toBe(false);
    expect(feito.some((o) => o[0] === "JOANA SILVA")).toBe(false);
  });

  it("nome comprido encolhe em vez de invadir o campo do lado", async () => {
    const comprido = "MARIA DA CONCEIÇÃO APARECIDA DOS SANTOS OLIVEIRA RODRIGUES FERREIRA";
    const feito = desenhos((await gerarSadt({ ...CASO, paciente: comprido }, modeloBuffer())).pdf);
    const op = feito.find((o) => o[0] === comprido)!;
    expect(op[3]).toBeLessThan(10);
    expect(op[3]).toBeGreaterThanOrEqual(6);
  });

  it("preserva a página do modelo, do tamanho original", async () => {
    const { pdf } = await gerarSadt(CASO, modeloBuffer());
    const { PDFDocument } = await import("pdf-lib");
    const gerado = await PDFDocument.load(pdf);
    expect(gerado.getPageCount()).toBe(1);
    expect(gerado.getPage(0).getSize()).toEqual({ width: 595, height: 842 });
  });
});
