import { describe, expect, it } from "vitest";
import {
  ajustarTamanho,
  emMaiusculas,
  emMaiusculasMultilinha,
  emWinAnsi,
  hoje,
  linhaDeBase,
  nomeDeArquivo,
  quebrarTexto,
  validarData,
  type Medida,
} from "../pdf";

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
    expect(ajustarTamanho(REGUA, "X".repeat(20), 190, 9.5)).toBe(9.5);
    expect(ajustarTamanho(REGUA, "X".repeat(20), 150, 9.5)).toBe(7.5);
  });

  it("não encolhe abaixo do piso, mesmo sem caber", () => {
    expect(ajustarTamanho(REGUA, "X".repeat(500), 10, 9.5)).toBe(6.0);
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

describe("datas", () => {
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
});

describe("nome do arquivo", () => {
  it("leva paciente e data, com a data em traços", () => {
    expect(nomeDeArquivo("APAC", "MARIA DAS GRAÇAS", "19/09/2026")).toBe(
      "APAC - MARIA DAS GRAÇAS - 19-09-2026.pdf",
    );
  });

  it("tira o que o sistema de arquivos recusa", () => {
    expect(nomeDeArquivo("APAC", 'MA/RIA: "X" <1>|?*', "01/01/2026")).toBe("APAC - MARIA X 1 - 01-01-2026.pdf");
  });

  it("nome vazio não gera arquivo sem nome", () => {
    expect(nomeDeArquivo("APAC", "///", "01/01/2026")).toBe("APAC - PACIENTE - 01-01-2026.pdf");
  });
});

