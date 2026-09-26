import { describe, expect, it } from "vitest";
import { cortar, datasDoPlantao, resumoDaDivisao } from "@/lib/imagemPlantao";
import { dividirPlantao } from "@/lib/plantao";

// Uma "fonte" em que cada caractere mede 1: largura = número de letras.
const medir = (t: string) => t.length;

describe("imagem da divisão", () => {
  it("o que cabe fica inteiro", () => {
    expect(cortar("JAPA", 10, medir)).toBe("JAPA");
    expect(cortar("JAPA", 4, medir)).toBe("JAPA");
  });

  it("o que não cabe ganha reticências dentro da largura", () => {
    const nome = "MARIA EDUARDA DOS SANTOS OLIVEIRA";
    const cortado = cortar(nome, 12, medir);
    expect(cortado.endsWith("…")).toBe(true);
    expect(medir(cortado)).toBeLessThanOrEqual(12);
    // Sem espaço sobrando antes das reticências.
    expect(cortado).not.toMatch(/\s…$/);
  });

  it("resumo do cabeçalho igual ao da tela", () => {
    const d = dividirPlantao("23:52", "07:00", ["japa", "iza", "bruno"])!;
    expect(resumoDaDivisao(d)).toBe("23:52 às 07:00 · 7h08 · 2h23 cada");
  });
});

describe("data do plantão na imagem", () => {
  // 25/09/2026 é sexta; 30/09/2026, quarta.
  it("dividido antes da meia-noite: a noite inteira", () => {
    const d = dividirPlantao("22:00", "07:00", ["a", "b"])!;
    expect(datasDoPlantao(d, new Date(2026, 8, 25, 21, 50))).toBe("SEX 25/09 → SÁB 26/09");
  });

  it("dividido depois da meia-noite: só o dia de hoje", () => {
    const d = dividirPlantao("00:12", "07:00", ["a", "b"])!;
    expect(datasDoPlantao(d, new Date(2026, 8, 26, 0, 13))).toBe("SÁB 26/09");
  });

  it("início corrigido para antes da meia-noite, depois dela: o plantão de ontem", () => {
    const d = dividirPlantao("23:50", "07:00", ["a", "b"])!;
    expect(datasDoPlantao(d, new Date(2026, 8, 26, 0, 13))).toBe("SEX 25/09 → SÁB 26/09");
  });

  it("vira o mês", () => {
    const d = dividirPlantao("22:00", "07:00", ["a", "b"])!;
    expect(datasDoPlantao(d, new Date(2026, 8, 30, 21, 0))).toBe("QUA 30/09 → QUI 01/10");
  });

  it("terminar à meia-noite não é o dia seguinte", () => {
    const d = dividirPlantao("22:00", "00:00", ["a", "b"])!;
    expect(datasDoPlantao(d, new Date(2026, 8, 25, 21, 0))).toBe("SEX 25/09");
  });
});
