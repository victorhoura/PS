import { describe, expect, it } from "vitest";
import { cortar, resumoDaDivisao } from "@/lib/imagemPlantao";
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
