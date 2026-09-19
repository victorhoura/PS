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

/**
 * Layout real da página de resultados do SHIFT/AFIP, como ele chega pelo
 * Ctrl+C: rótulo numa linha, resultado na seguinte, unidade e referência
 * abaixo, com espaços não separáveis (\u00a0) entre as colunas. Os valores
 * são inventados; o que importa aqui é a forma da página.
 */
const AFIP_REAL = [
  "Hemograma Completo",
  "\u00a0",
  "Material:",
  "Sangue total (EDTA)",
  "Coleta:",
  "19/09/2026 - 07:50:47",
  "Liberação:",
  "19/09/2026 - 08:32:09",
  "Eritrograma",
  "Valores Encontrados",
  "Valores de Referência",
  "Hemoglobina",
  "12,9",
  "\u00a0",
  "g/dL",
  "\u00a0 12,0 - 15,0 g/dL",
  "Hematócrito",
  "37,5",
  "\u00a0",
  "%",
  "36,0 - 46,0 %",
  "Plaquetas",
  "233",
  "\u00a0",
  "Mil/mm3",
  "150 - \u00a0400 Mil/mm3",
  "Leucograma",
  "Valores Encontrados",
  "Leucócitos",
  "15,64",
  "4,5 - 11,0",
  "Bastonetes",
  "0,0",
  "0,00",
  "0 - 0,7",
  "Ureia, sérica",
  "Coleta:",
  "19/09/2026 - 07:50:47",
  "Resultado",
  "65,0",
  "\u00a0",
  "mg/dL",
  "Valor de referência:",
  "Adultos",
  "Feminino \u00a0: 15 a 36 mg/dL",
  "Urina I",
  "\u00a0",
  "Material:",
  "Urina (jato médio)",
  "Coleta:",
  "19/09/2026 - 07:50:47",
  "\u00a0",
  "Valor de Referência",
  "Densidade",
  "1020",
  "\u00a0",
  "1005 até 1030",
  "pH",
  "5,0",
  "\u00a0",
  "5,0\u00a0até\u00a06,0",
  "\u00a0",
  "Proteína",
  "+",
  "\u00a0",
  "Valor de referência :",
  "Negativo",
  "\u00a0+ Equivale a aproximadamente\u00a030 mg/dL",
  "+ + Equivale a aproximadamente 100 mg/dL",
  "Glicose",
  "Negativo",
  "\u00a0",
  "Negativo",
  "\u00a0",
  "Cetona",
  "Negativo",
  "\u00a0",
  "Negativo",
  "\u00a0",
  "Sangue",
  "Negativo",
  "\u00a0",
  "Negativo",
  "\u00a0",
  "Nitrito",
  "Negativo",
  "\u00a0",
  "Negativo",
  "\u00a0",
  "Células epiteliais",
  "Algumas",
  "\u00a0",
  "Raras",
  "\u00a0",
  "Leucócitos",
  "14.000",
  "\u00a0",
  "/mL",
  "Até 20.000 /mL",
  "\u00a0",
  "Hemácias",
  "7.000",
  "\u00a0",
  "/mL",
  "Até 20.000 /mL",
  "\u00a0",
  "Cristais",
  "Ausentes",
  "\u00a0",
  "Ausentes",
  "\u00a0",
  "Bactérias",
  "2,0 a 5,0",
  "\u00a0",
  "/mL",
  "\u00a0",
  "Inferior a 1,0 /mL",
].join("\n");

/** O mesmo layout, com o sedimento francamente alterado. */
const AFIP_URINA_ALTERADA = AFIP_REAL.replace("Proteína\n+\n", "Proteína\n+++\n")
  .replace("Cetona\nNegativo", "Cetona\n+")
  .replace("Sangue\nNegativo", "Sangue\n++")
  .replace("Nitrito\nNegativo", "Nitrito\nPositivo")
  .replace("Leucócitos\n14.000", "Leucócitos\n250.000")
  .replace("Hemácias\n7.000", "Hemácias\n180.000");

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

describe("página real do SHIFT/AFIP", () => {
  it("transcreve o laudo inteiro", () => {
    expect(formatarLabs(AFIP_REAL)).toBe(
      "LABS 19/09/26: HB 12,9 / HT 37,5 / PLAQ 233.000 / LEUC 15.640 SEM DESVIO / UR 65,0 / " +
        "UR1 PH 5,0 PROT + LEUC 14.000 BACT 2,0 a 5,0",
    );
  });

  it("REGRESSÃO: lê a cruz do resultado, não o 'Negativo' da referência", () => {
    // O layout é "Proteína / + / Valor de referência : / Negativo". O \b antes
    // do "+" nunca casava, a busca seguia em frente e trazia o NEGATIVO da
    // coluna de referência — uma proteinúria +++ saía do laudo como se fosse
    // normal, calada.
    const saida = formatarLabs(AFIP_URINA_ALTERADA);
    expect(saida).toContain("PROT +++");
    expect(saida).toContain("CET +");
    expect(saida).toContain("SANG ++");
    expect(saida).toContain("NITRITO POSITIVO");
  });

  it("REGRESSÃO: faixa de bactérias não vira só o primeiro número", () => {
    // "2,0 a 5,0" virava "BACT 2,0", que é outro resultado.
    expect(formatarLabs(AFIP_REAL)).toContain("BACT 2,0 a 5,0");
  });

  it("REGRESSÃO: leucocitúria mantém o ponto de milhar do laudo", () => {
    expect(formatarLabs(AFIP_REAL)).toContain("LEUC 14.000");
    expect(formatarLabs(AFIP_REAL)).not.toContain("LEUC 14000");
  });

  it("qualitativo negativo continua fora, e hemácias normais também", () => {
    const saida = formatarLabs(AFIP_REAL);
    expect(saida).not.toContain("CET");
    expect(saida).not.toContain("SANG");
    expect(saida).not.toContain("NITRITO");
    // 7.000/mL com referência até 20.000 não é achado.
    expect(saida).not.toContain("HEM ");
  });

  it("sedimento alterado sai inteiro", () => {
    expect(formatarLabs(AFIP_URINA_ALTERADA)).toBe(
      "LABS 19/09/26: HB 12,9 / HT 37,5 / PLAQ 233.000 / LEUC 15.640 SEM DESVIO / UR 65,0 / " +
        "UR1 PH 5,0 PROT +++ CET + SANG ++ NITRITO POSITIVO LEUC 250.000 HEM 180.000 BACT 2,0 a 5,0",
    );
  });

  it("cruzes separadas por espaço contam como uma marcação só", () => {
    const saida = formatarLabs(AFIP_REAL.replace("Proteína\n+\n", "Proteína\n+ +\n"));
    expect(saida).toContain("PROT ++");
  });
});
