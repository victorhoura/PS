import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  ajustarTamanho,
  emMaiusculas,
  emMaiusculasMultilinha,
  emWinAnsi,
  gerarApac,
  hoje,
  linhaDeBase,
  medirJustificativa,
  nomeDoArquivo,
  quantidadeValida,
  quebrarTexto,
  validarData,
  type DadosApac,
  type Medida,
} from "../apac";

/** Régua de mentira: cada caractere mede 1pt por ponto de corpo. */
const REGUA: Medida = (texto, tamanho) => texto.length * tamanho;

describe("texto", () => {
  it("normaliza para maiúsculas sem espaço dobrado", () => {
    expect(emMaiusculas("  maria   das   graças  ")).toBe("MARIA DAS GRAÇAS");
    expect(emMaiusculas("")).toBe("");
  });

  it("preserva as quebras da justificativa e apara as pontas", () => {
    expect(emMaiusculasMultilinha("\n\n uma  linha \n\n outra \n\n")).toBe("UMA LINHA\n\nOUTRA");
  });

  it("mantém o português inteiro e resolve o que o Helvetica não escreve", () => {
    expect(emWinAnsi("AÇÃO ÊNFASE ÍNDICE ÔNIBUS ÚTERO ÀS")).toBe("AÇÃO ÊNFASE ÍNDICE ÔNIBUS ÚTERO ÀS");
    // Fora do WinAnsi: vira a letra sem acento em vez de derrubar a página.
    expect(emWinAnsi("DOSE DE 10Ā")).toBe("DOSE DE 10A");
    expect(emWinAnsi("SEM 中文 AQUI")).toBe("SEM  AQUI");
  });
});

describe("medidas", () => {
  it("encolhe a fonte até caber", () => {
    // 20 caracteres a 9.5 medem 190pt: cabem em 190, não cabem em 150.
    expect(ajustarTamanho(REGUA, "X".repeat(20), 190)).toBe(9.5);
    expect(ajustarTamanho(REGUA, "X".repeat(20), 150)).toBe(7.5);
  });

  it("não encolhe abaixo do piso, mesmo sem caber", () => {
    expect(ajustarTamanho(REGUA, "X".repeat(500), 10)).toBe(6.0);
  });

  it("centraliza pela métrica do Helvetica, não pelo meio da caixa", () => {
    // ascent 0.718 e descent -0.207 dão um deslocamento de 0.2555 por ponto.
    expect(linhaDeBase(669.6, 687.6, 9.5)).toBeCloseTo(676.1728, 4);
    expect(linhaDeBase(532.74, 553.2, 9.5)).toBeCloseTo(540.5428, 4);
  });

  it("quebra pela largura e respeita as quebras digitadas", () => {
    expect(quebrarTexto(REGUA, "AA BB CC", 5, 1)).toEqual(["AA BB", "CC"]);
    expect(quebrarTexto(REGUA, "AA\n\nBB", 50, 1)).toEqual(["AA", "", "BB"]);
  });

  it("uma palavra maior que a caixa fica na linha dela, sem travar", () => {
    expect(quebrarTexto(REGUA, "AAAAAAAAAA BB", 3, 1)).toEqual(["AAAAAAAAAA", "BB"]);
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

describe("datas e quantidades", () => {
  it("aceita um dígito e devolve sempre DD/MM/AAAA", () => {
    expect(validarData("5/7/2026")).toBe("05/07/2026");
    expect(validarData(" 19/09/2026 ")).toBe("19/09/2026");
  });

  it("recusa data que não existe no calendário", () => {
    expect(validarData("31/02/2026")).toBeNull();
    expect(validarData("29/02/2025")).toBeNull();
    expect(validarData("29/02/2024")).toBe("29/02/2024");
    expect(validarData("00/01/2026")).toBeNull();
    expect(validarData("19/13/2026")).toBeNull();
  });

  it("recusa formato que não é data", () => {
    expect(validarData("19-09-2026")).toBeNull();
    expect(validarData("19/09/26")).toBeNull();
    expect(validarData("")).toBeNull();
  });

  it("hoje sai no formato do formulário", () => {
    expect(hoje()).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(validarData(hoje())).toBe(hoje());
  });

  it("quantidade vale de 1 a 99", () => {
    expect(quantidadeValida("1")).toBe(true);
    expect(quantidadeValida("99")).toBe(true);
    expect(quantidadeValida("0")).toBe(false);
    expect(quantidadeValida("100")).toBe(false);
    expect(quantidadeValida("")).toBe(false);
    expect(quantidadeValida("1a")).toBe(false);
  });
});

describe("nome do arquivo", () => {
  it("leva paciente e data, com a data em traços", () => {
    expect(nomeDoArquivo("MARIA DAS GRAÇAS", "19/09/2026")).toBe(
      "APAC - MARIA DAS GRAÇAS - 19-09-2026.pdf",
    );
  });

  it("tira o que o sistema de arquivos recusa", () => {
    expect(nomeDoArquivo('MA/RIA: "X" <1>|?*', "01/01/2026")).toBe("APAC - MARIA X 1 - 01-01-2026.pdf");
  });

  it("nome vazio não gera arquivo sem nome", () => {
    expect(nomeDoArquivo("///", "01/01/2026")).toBe("APAC - PACIENTE - 01-01-2026.pdf");
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
