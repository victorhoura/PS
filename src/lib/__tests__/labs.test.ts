import { describe, expect, it } from "vitest";
import { formatarLabs, paraNumero, formatarNumero, milhar, dataCurta } from "../labs";

/**
 * Laudos sintéticos no formato SHIFT/AFIP. Nenhum dado real de paciente.
 * Os casos marcados REGRESSÃO travam bugs que existiam no PS.py original.
 */

const HEMOGRAMA_COMPLETO = `
Informações da ordem de serviço
COLETA: 14/03/2025 - 08:12:00

HEMOGRAMA
Hemoglobina
13,4
Hematócrito
40,2
Leucócitos
12,5
Neutrófilos
78
Bastonetes
4
Plaquetas
322

UREIA
Resultado
38

CREATININA
Creatinina
1,12

SÓDIO
Resultado
138

POTÁSSIO
Resultado
4,2

PROTEÍNA C REATIVA - PCR
Resultado
48,7
`;

const URINA_ALTERADA = `
COLETA: 20/06/2025

URINA I
pH
6,0
Proteína
NEGATIVO
Cetona
NEGATIVO
Sangue
POSITIVO
Nitrito
POSITIVO
Leucócitos
25000
Hemácias
SUPERIOR A 1.000.000
Bactérias
SUPERIOR A 10,0
Leveduras
AUSENTE
`;

const CREATININA_COM_RESULTADO = `
COLETA: 01/02/2025
CREATININA
Resultado
1,45
UREIA
Resultado
52
`;

const SO_URINA = `
COLETA: 03/03/2025
URINA I
pH
5,5
Leucócitos
25000
`;

describe("helpers numéricos pt-BR", () => {
  it("converte decimal com vírgula", () => {
    expect(paraNumero("13,4")).toBe(13.4);
    expect(paraNumero("1.234,5")).toBe(1234.5);
    expect(paraNumero("322")).toBe(322);
  });

  it("preserva as casas decimais do laudo", () => {
    expect(formatarNumero("13,4", 13.4)).toBe("13,4");
    expect(formatarNumero("1,120", 1.12)).toBe("1,120");
    expect(formatarNumero("322", 322)).toBe("322");
  });

  it("separa milhar com ponto", () => {
    expect(milhar(322000)).toBe("322.000");
    expect(milhar(12500)).toBe("12.500");
  });

  it("acha a data de coleta nos dois formatos", () => {
    expect(dataCurta("COLETA: 14/03/2025 - 08:12:00")).toBe("14/03/25");
    expect(dataCurta("20/06/2025 - 10:00:00")).toBe("20/06/25");
    expect(dataCurta("sem data nenhuma")).toBe("__/__/__");
  });
});

describe("formatarLabs", () => {
  it("devolve vazio para entrada vazia ou sem exames", () => {
    expect(formatarLabs("")).toBe("");
    expect(formatarLabs(null)).toBe("");
    expect(formatarLabs(undefined)).toBe("");
    expect(formatarLabs("texto qualquer sem nenhum exame")).toBe("");
  });

  it("monta a linha de um laudo completo", () => {
    expect(formatarLabs(HEMOGRAMA_COMPLETO)).toBe(
      "LABS 14/03/25: HB 13,4 / HT 40,2 / PLAQ 322.000 / LEUC 12.500 / NEUT 78 / BAST 4 / UR 38 / CR 1,12 / NA 138 / K 4,2 / PCR 48,7",
    );
  });

  it("marca SEM DESVIO quando não há bastonetes", () => {
    expect(formatarLabs("COLETA: 02/01/2025\nHEMOGRAMA\nLeucócitos\n7,2\nBastonetes\n0\n")).toContain(
      "LEUC 7.200 SEM DESVIO",
    );
  });

  it("converte plaquetas de Mil/mm3 para valor absoluto", () => {
    expect(formatarLabs(HEMOGRAMA_COMPLETO)).toContain("PLAQ 322.000");
  });

  // ---- REGRESSÃO: bugs do PS.py original ----

  it("REGRESSÃO: não duplica creatinina quando o laudo traz 'Resultado'", () => {
    const saida = formatarLabs(CREATININA_COM_RESULTADO);
    expect(saida).toBe("LABS 01/02/25: UR 52 / CR 1,45");
    expect(saida.match(/\bCR\b/g)).toHaveLength(1);
  });

  it("REGRESSÃO: não inventa UR1 quando o laudo não tem urina", () => {
    expect(formatarLabs(HEMOGRAMA_COMPLETO)).not.toContain("UR1");
  });

  it("REGRESSÃO: não inventa leucograma a partir da leucocitúria", () => {
    const saida = formatarLabs(SO_URINA);
    expect(saida).toBe("LABS 03/03/25: UR1 PH 5,5 LEUC 25000");
    expect(saida).not.toContain("SEM DESVIO");
  });

  it("REGRESSÃO: número sem separador não é truncado em 3 dígitos", () => {
    // No original, 25000 virava 250 — erro de 100x num valor clínico.
    expect(formatarLabs(SO_URINA)).toContain("LEUC 25000");
    expect(formatarLabs(SO_URINA)).not.toContain("LEUC 250 ");
  });

  it("REGRESSÃO: preserva o '>' de valores 'SUPERIOR A'", () => {
    const saida = formatarLabs(URINA_ALTERADA);
    expect(saida).toContain("HEM >1.000.000");
    expect(saida).toContain("BACT >10,0");
  });

  it("urina: pH sempre sai, qualitativos só se alterados", () => {
    const saida = formatarLabs(URINA_ALTERADA);
    expect(saida).toContain("PH 6,0");
    expect(saida).toContain("SANG POSITIVO");
    expect(saida).toContain("NITRITO POSITIVO");
    // NEGATIVO/AUSENTE não devem aparecer
    expect(saida).not.toContain("PROT");
    expect(saida).not.toContain("CET");
    expect(saida).not.toContain("LEVED");
  });

  it("lê o painel hepático completo", () => {
    const saida = formatarLabs(`
COLETA: 09/09/2025
TGO/AST
Resultado
88
TGP/ALT
Resultado
102
BILIRRUBINA TOTAL
Resultado
3,4
ALBUMINA
Resultado
3,2
`);
    expect(saida).toBe("LABS 09/09/25: TGO 88 / TGP 102 / BT 3,4 / ALB 3,2");
  });

  it("usa placeholder quando não acha a data", () => {
    expect(formatarLabs("HEMOGRAMA\nHemoglobina\n11,0\n")).toContain("LABS __/__/__:");
  });
});
