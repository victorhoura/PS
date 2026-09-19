import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { gerarApac, medirJustificativa, quantidadeValida, type DadosApac } from "../apac";
import type { Medida } from "../pdf";

/** Régua de mentira: cada caractere mede 1pt por ponto de corpo. */
const REGUA: Medida = (texto, tamanho) => texto.length * tamanho;

describe("quantidade", () => {
  it("vale de 1 a 99", () => {
    expect(quantidadeValida("1")).toBe(true);
    expect(quantidadeValida("99")).toBe(true);
    expect(quantidadeValida("0")).toBe(false);
    expect(quantidadeValida("100")).toBe(false);
    expect(quantidadeValida("")).toBe(false);
    expect(quantidadeValida("1a")).toBe(false);
  });
});

describe("justificativa", () => {
  it("passa de 9 para 7,5 quando não cabe em cinco linhas", () => {
    const curta = medirJustificativa(REGUA, "AA BB");
    expect(curta.tamanho).toBe(9.0);

    const longa = medirJustificativa(REGUA, "PALAVRA ".repeat(400));
    expect(longa.tamanho).toBe(7.5);
  });

  it("devolve o que não coube em vez de cortar em silêncio", () => {
    const r = medirJustificativa(REGUA, "PALAVRA ".repeat(400));
    expect(r.linhas).toHaveLength(6);
    expect(r.sobra.length).toBeGreaterThan(0);
  });

  it("o que cabe não tem sobra", () => {
    expect(medirJustificativa(REGUA, "UMA LINHA SO").sobra).toEqual([]);
  });
});


// ------------------------------------------------------------------ PDF

const MODELO = readFileSync("public/APAC.pdf");
const modeloBuffer = () =>
  MODELO.buffer.slice(MODELO.byteOffset, MODELO.byteOffset + MODELO.byteLength) as ArrayBuffer;

const CASO: DadosApac = {
  paciente: "MARIA DAS GRAÇAS DE ALMEIDA CONCEIÇÃO",
  nascimento: "07/03/1958",
  exame: "TC DE ABDOME TOTAL S/ CONSTRASTE",
  quantidade: "1",
  exameSec1: "",
  quantidadeSec1: "",
  exameSec2: "",
  quantidadeSec2: "",
  diagnostico: "ABDOME AGUDO",
  cid: "R10",
  cidSecundario: "",
  justificativa:
    "PACIENTE APRESENTA NO EXAME FÍSICO UM ABODOME GLOBOSO, DISTENDIDO E DOLOROSO A PALPAÇÃO SUPERFICIAL E PROFUNDA, COM DESCOMPRESSÃO BRUSCA POSITIVO.\nCASO DISCUTIDO COM A CG.",
  medico: "VICTOR M. HOURA",
  solicitacao: "19/09/2026",
};

/**
 * Lê do PDF gerado cada texto desenhado com posição e corpo. O pdf-lib grava
 * a string em hexadecimal, daí a conversão.
 */
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
      // stream binário do modelo (a logo do SUS) — não interessa
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

describe("PDF gerado", () => {
  /**
   * Posições conferidas contra o reportlab: este caso foi gerado pelo APAC.py
   * original e as coordenadas abaixo são as dele, ponto a ponto.
   */
  const ESPERADO: [string, number, number, number][] = [
    ["MARIA DAS GRAÇAS DE ALMEIDA CONCEIÇÃO", 45.9, 699.8, 9.5],
    ["07", 309.598, 676.1728, 9.5],
    ["03", 336.868, 676.1728, 9.5],
    ["1958", 361.946, 676.1728, 9.5],
    ["TC DE ABDOME TOTAL S/ CONSTRASTE", 311.5, 540.5428, 9.5],
    ["1", 534.989, 540.5428, 9.5],
    ["ABDOME AGUDO", 55.4, 344.0, 9.5],
    ["R10", 349.0, 344.0, 9.5],
    ["PACIENTE APRESENTA NO EXAME FÍSICO UM ABODOME GLOBOSO, DISTENDIDO E DOLOROSO A", 55.4, 306.0, 9.0],
    ["PALPAÇÃO SUPERFICIAL E PROFUNDA, COM DESCOMPRESSÃO BRUSCA POSITIVO.", 55.4, 294.0, 9.0],
    ["CASO DISCUTIDO COM A CG.", 55.4, 282.0, 9.0],
    ["VICTOR M. HOURA", 56.0, 214.5, 9.5],
    ["19", 311.008, 214.4428, 9.5],
    ["09", 335.188, 214.4428, 9.5],
    ["2026", 359.426, 214.4428, 9.5],
  ];

  it("escreve cada campo onde o APAC.py escrevia", async () => {
    const feito = desenhos((await gerarApac(CASO, modeloBuffer())).pdf);

    expect(feito).toHaveLength(ESPERADO.length);
    feito.forEach((op, i) => {
      const alvo = ESPERADO[i];
      expect(op[0]).toBe(alvo[0]);
      expect(op[1]).toBeCloseTo(alvo[1], 2);
      expect(op[2]).toBeCloseTo(alvo[2], 2);
      expect(op[3]).toBeCloseTo(alvo[3], 3);
    });
  });

  it("mede sem kerning: o pdf-lib mede com e escreve sem, e a linha vazava", async () => {
    // Esta linha mede 480.123pt sem kerning e 474.4pt com. A caixa tem 480.
    const feito = desenhos((await gerarApac(CASO, modeloBuffer())).pdf);
    const primeira = feito.find((o) => o[0].startsWith("PACIENTE APRESENTA"))!;
    expect(primeira[0].endsWith("DOLOROSO A")).toBe(true);
  });

  it("procedimento secundário só entra quando preenchido", async () => {
    const sem = desenhos((await gerarApac(CASO, modeloBuffer())).pdf);
    const com = desenhos(
      (
        await gerarApac(
          { ...CASO, exameSec1: "RX DE TÓRAX", quantidadeSec1: "2" },
          modeloBuffer(),
        )
      ).pdf,
    );
    expect(com.length).toBe(sem.length + 2);
    expect(com.some((o) => o[0] === "RX DE TÓRAX")).toBe(true);
  });

  it("preserva as duas páginas do modelo", async () => {
    const { pdf } = await gerarApac(CASO, modeloBuffer());
    const { PDFDocument } = await import("pdf-lib");
    const gerado = await PDFDocument.load(pdf);
    const modelo = await PDFDocument.load(modeloBuffer());
    expect(gerado.getPageCount()).toBe(modelo.getPageCount());
    expect(gerado.getPage(0).getSize()).toEqual(modelo.getPage(0).getSize());
  });
});
