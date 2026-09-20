import { describe, expect, it } from "vitest";
import { formatarLabs, paraNumero, milhar, dataDaColeta } from "../labs";

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

  it("separa milhar com ponto", () => {
    expect(milhar(322000)).toBe("322.000");
    expect(milhar(12500)).toBe("12.500");
  });

  it("acha a data de coleta nos dois formatos", () => {
    expect(dataDaColeta("COLETA: 14/03/2025 - 08:12:00")).toBe("14/03/2025");
    expect(dataDaColeta("20/06/2025 - 10:00:00")).toBe("20/06/2025");
    expect(dataDaColeta("sem data nenhuma")).toBe("__/__/____");
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
      "LABS 14/03/2025: HB 13,4 | HT 40,2 | PLAQ 322.000 | LEUC 12.500 | NEUT 78 | BAST 4 | UR 38 | CR 1,12 | NA 138 | K 4,2 | PCR 48,7",
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
    expect(saida).toBe("LABS 01/02/2025: UR 52 | CR 1,45");
    expect(saida.match(/\bCR\b/g)).toHaveLength(1);
  });

  it("REGRESSÃO: não inventa UR1 quando o laudo não tem urina", () => {
    expect(formatarLabs(HEMOGRAMA_COMPLETO)).not.toContain("UR1");
  });

  it("REGRESSÃO: não inventa leucograma a partir da leucocitúria", () => {
    const saida = formatarLabs(SO_URINA);
    expect(saida).toBe("LABS 03/03/2025: UR1 PH 5,5 LEUC 25000");
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
    expect(saida).toBe("LABS 09/09/2025: TGO 88 | TGP 102 | BT 3,4 | ALB 3,2");
  });

  it("usa placeholder quando não acha a data", () => {
    expect(formatarLabs("HEMOGRAMA\nHemoglobina\n11,0\n")).toContain("LABS __/__/____:");
  });
});

describe("página real do SHIFT/AFIP", () => {
  it("transcreve o laudo inteiro", () => {
    expect(formatarLabs(AFIP_REAL)).toBe(
      "LABS 19/09/2026: HB 12,9 | HT 37,5 | PLAQ 233.000 | LEUC 15.640 SEM DESVIO | UR 65,0 | " +
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
      "LABS 19/09/2026: HB 12,9 | HT 37,5 | PLAQ 233.000 | LEUC 15.640 SEM DESVIO | UR 65,0 | " +
        "UR1 PH 5,0 PROT +++ CET + SANG ++ NITRITO POSITIVO LEUC 250.000 HEM 180.000 BACT 2,0 a 5,0",
    );
  });

  it("cruzes separadas por espaço contam como uma marcação só", () => {
    const saida = formatarLabs(AFIP_REAL.replace("Proteína\n+\n", "Proteína\n+ +\n"));
    expect(saida).toContain("PROT ++");
  });
});

/**
 * A outra metade da página da AFIP: os exames que rotulam o valor com o nome
 * do próprio analito em vez da palavra "Resultado".
 *
 * O formato é o da página real — cabeçalho Material/Coleta/Método/Liberação,
 * valor, unidade, referência, a nota de rodapé e a série do gráfico — com
 * valores inventados. Nenhum dado de paciente.
 */
const AFIP_ROTULO_PROPRIO = `
Informações da ordem de serviço
O.S.:
1440-00000-0000
-
20/09/2026 - 02:54:04
Unidade de coleta:
Pronto Socorro
Velocidade de Hemossedimentação - VHS
 
Material:
Sangue total (EDTA)
Coleta:
20/09/2026 - 02:54:04
Método:
WESTERGREEN - MANUAL
 
Primeira hora                          
47
 
mm3/hora
 
Valor de referência:
Mulheres
< 50 anos: 0 - 20 mm3/Hora
 
Observações gerais:\tAMOSTRA NÃO COLETADA PELO LABORATÓRIO
 
Exame assinado por Dra. Fulana - CRBM: 00000__________________________________________________
 
Gasometria Arterial
 
Material:
Sangue total
Coleta:
20/09/2026 - 02:54:04
Método:
Oximetria
 
PH
7,210
 
 
Valor de referência:
7,38 ate 7,44
 
PO2
58,0
 
mmHg
 
Valor de referência:
80,00 ate 100,00 mmHg
 
PCO2                                    
61,0
 
mmHg
 
Valor de referência:
35,00 ate 40,00 mmHg
 
Bicarbonato(HCO3)
18,7
 
mmol/L
 
Valor de referência:
22,00 ate 26,00 mmol/L
 
Base Exces
-8,4
 
 
Valor de referência:
-3,00 ate 3,00
 
Saturação de O2
88,0
 
%
 
Observação:
O documento do CLSI C46-A recomenda o uso de seringas plasticas.
 
Liberado por Dr. Fulano - CRBM 00000
 
Dosagem sérica de Creatinina
 
Material:
Soro
Coleta:
20/09/2026 - 02:54:04
Método:
Cinético de dois pontos - QS
 
Creatinina
1,86
mg/dL
 
Valor de Referência:
Adultos
Feminino : 0,52 a 1,04 mg/dL
 
1,31
0,92
1,86
18/06/2615:16:11
27/08/2614:46:13
20/09/2602:54:04
 
Observações gerais:\tAMOSTRA NÃO COLETADA PELO LABORATÓRIO
 
Liberado por Dr. Fulano - CRBM 00000
 
TFG - Taxa de Filtração Glomerular
Método:
TFG (Cálculo - RFG: CKD-EPI 2021)
 
Resultado
Superior a 90
mL/min/1,73 m2
 
Valor de Referência:
Normal........................: >= 90 mL/min/1,73 m2
 
Observações gerais:\tAMOSTRA NÃO COLETADA PELO LABORATÓRIO
 
Potássio
 
Material:
Soro
Coleta:
20/09/2026 - 02:54:04
Método:
Potenciometria eletrodo ion-específico
 
Resultado
2,9
 
mmol/L
 
Valor de referência:
3,5 ate 5,1 mmol/L
 
Nota:
 A pseudo-hiperpotassemia pode ser suspeitada quando nao houver causa aparente para concentracoes elevadas de potassio. Nestes casos, sugerimos nova coleta a criterio medico.
 
5,3
4,5
2,9
18/06/2615:16:11
27/08/2614:46:13
20/09/2602:54:04
 
Observações gerais:\tAMOSTRA NÃO COLETADA PELO LABORATÓRIO
 
Exame assinado por Dra. Fulana - CRBM: 00000__________________________________________________
 
Proteína Total e Frações
 
Material:
Soro
Coleta:
20/09/2026 - 02:54:04
Método:
Colorimétrico - QS
 
Proteínas
5,4
 
g/dL
 
Valor de referência:
Adultos        : 6,3 a 8,2 g/dL
 
Albumina
2,10
 
g/dL
 
Valor de referência:
Adultos    : 3,5 a 5,0 g/dL
 
Globulina
3,3
 
g/dL
 
Valor de referência:
2,0 ate 3,9 g/dL
 
Relação Albumina/Globulina
0,6
 
 
Valor de referência:
0,8 a 2,2
 
Observações gerais:\tAMOSTRA NÃO COLETADA PELO LABORATÓRIO
 
Exame assinado por Dra. Fulana - CRBM: 00000__________________________________________________
 
Bilirrubinas
 
Material:
Soro
Coleta:
20/09/2026 - 02:54:04
Método:
Colorimétrico de ponto final - QS
 
Bilirrubina Total
4,80
 
mg/dL
 
Valor de referência:
Adulto: 0,2 a  1,3 mg/dL
 
Bilirrubina Direta
3,60
 
mg/dL
 
Valor de referência:
Adulto: 0,0 a 0,3 mg/dL
 
Bilirrubina Indireta
1,20
 
mg/dL
 
Valor de referência:
Inferior ou igual a 0,80 mg/dL
 
Observações gerais:\tAMOSTRA NÃO COLETADA PELO LABORATÓRIO
 
Exame assinado por Dra. Fulana - CRBM: 00000
`;

/** O leucograma da AFIP: porcentagem e absoluto em Mil/mm3, uma coluna por linha. */
const AFIP_DIFERENCIAL = `
Coleta:
14/08/2026 - 03:10:00
Hemograma Completo
Eritrograma
Hemoglobina
9,4
 
g/dL
 12,0 - 15,0 g/dL
Plaquetas
96
 
Mil/mm3
    150 -  400 Mil/mm3
 
Leucograma
Valores Encontrados
Valores de Referência
 
(%)
Mil/mm3
(Mil/mm3)
Leucócitos
24,80
 
  4,5 - 11,0
 
 
Neutrófilos
84,2
 
20,88
 
  1,8 - 7,70
 
   Bastonetes
11,0
 
2,73
 
    0 - 0,7
 
   Segmentados
73,2
 
18,15
 
  1,8 - 7,0
 
Linfócitos típicos
8,4
 
2,08
 
  1,0 - 3,8
`;

describe("laudos que rotulam o valor com o nome do exame", () => {
  it("REGRESSÃO: bilirrubinas, proteínas e albumina não somem mais", () => {
    // Nenhum destes traz a palavra "Resultado". Antes saíam calados da
    // transcrição: a linha parecia completa e faltava o painel inteiro.
    const saida = formatarLabs(AFIP_ROTULO_PROPRIO);
    expect(saida).toContain("BT 4,80");
    expect(saida).toContain("BD 3,60");
    expect(saida).toContain("BI 1,20");
    expect(saida).toContain("PTOT 5,4");
    expect(saida).toContain("ALB 2,10");
    expect(saida).toContain("GLOB 3,3");
    expect(saida).toContain("A/G 0,6");
  });

  it("REGRESSÃO: o VHS é rotulado 'Primeira hora'", () => {
    expect(formatarLabs(AFIP_ROTULO_PROPRIO)).toContain("VHS 47");
  });

  it("lê a gasometria arterial inteira, com o sinal do excesso de base", () => {
    // Sem o sinal, "Base Exces -8,4" virava 8,4 e a acidose metabólica era
    // transcrita como alcalose.
    expect(formatarLabs(AFIP_ROTULO_PROPRIO)).toContain(
      "GASART PH 7,210 PO2 58,0 PCO2 61,0 HCO3 18,7 BE -8,4 SAT 88,0",
    );
  });

  it("REGRESSÃO: 'Superior a 90' vira '>90', não '90'", () => {
    // TFG 90 é o piso do normal; TFG >90 é normal. São leituras diferentes.
    const saida = formatarLabs(AFIP_ROTULO_PROPRIO);
    expect(saida).toContain("TFG >90");
    expect(saida).not.toMatch(/TFG 90\b/);
  });

  it("REGRESSÃO: a nota de rodapé não vira rótulo do gráfico", () => {
    // "concentracoes elevadas de potassio" era lido como rótulo, e o valor
    // vinha da série histórica logo abaixo: 5,3 no lugar de 2,9.
    const saida = formatarLabs(AFIP_ROTULO_PROPRIO);
    expect(saida).toContain("K 2,9");
    expect(saida).not.toContain("5,3");
  });

  it("REGRESSÃO: o título da seção não encerra o bloco do próprio exame", () => {
    // "Dosagem sérica de Creatinina" é seguida de "Creatinina / 1,86".
    // Cortar no segundo "Creatinina" deixava o bloco sem valor nenhum.
    expect(formatarLabs(AFIP_ROTULO_PROPRIO)).toContain("CR 1,86");
  });

  it("não confunde o gráfico histórico com o resultado", () => {
    expect(formatarLabs(AFIP_ROTULO_PROPRIO)).not.toContain("CR 1,31");
  });

  it("diferencial em duas colunas sai absoluto com a porcentagem ao lado", () => {
    const saida = formatarLabs(AFIP_DIFERENCIAL);
    expect(saida).toContain("LEUC 24.800");
    expect(saida).toContain("NEUT 20,88 (84,2%)");
    expect(saida).toContain("BAST 2,73 (11,0%)");
    expect(saida).not.toContain("SEM DESVIO");
  });

  it("não lê a faixa de referência como se fosse coluna", () => {
    // Depois das duas colunas vem "1,8 - 7,70", que não é valor encontrado.
    expect(formatarLabs(AFIP_DIFERENCIAL)).not.toContain("7,70");
  });

  it("REGRESSÃO: o pH da gasometria não vaza para a urina", () => {
    const comUrina = `${AFIP_ROTULO_PROPRIO}
Urina I
Material:
Urina (jato médio)
pH
6,5
 
5,0 até 6,0
Leucócitos
9.000
 
Até 20.000 /mL
`;
    const saida = formatarLabs(comUrina);
    expect(saida).toContain("GASART PH 7,210");
    expect(saida).toContain("UR1 PH 6,5");
    expect(saida).not.toContain("UR1 PH 7,210");
  });
});

/**
 * Os exames acrescentados que não aparecem nos laudos que tenho em mãos.
 * A forma é a mesma da página da AFIP; o que estes casos travam é que cada
 * um lê o próprio bloco e não invade o do vizinho.
 */
const AFIP_NOVOS = `
Coleta:
02/10/2026 - 04:20:00
Reticulócitos
Material:
Sangue total (EDTA)
 
Resultado
3,4
 
%
 
Observações gerais:\tnada
 
Procalcitonina
Material:
Soro
 
Resultado
12,60
 
ng/mL
 
Observações gerais:\tnada
 
Ácido Úrico
Material:
Soro
 
Resultado
9,1
 
mg/dL
 
Observações gerais:\tnada
 
Cloretos
Material:
Soro
 
Resultado
112
 
mmol/L
 
Observações gerais:\tnada
 
Cálcio Iônico
Material:
Soro
 
Resultado
0,92
 
mmol/L
 
Observações gerais:\tnada
 
Cálcio Total
Material:
Soro
 
Resultado
7,4
 
mg/dL
 
Observações gerais:\tnada
 
Fibrinogênio
Material:
Plasma citratado
 
Resultado
680
 
mg/dL
 
Observações gerais:\tnada
 
D-Dímero
Material:
Plasma citratado
 
Resultado
4,80
 
ug/mL
 
Observações gerais:\tnada
 
NT-proBNP
Material:
Soro
 
Resultado
3.210
 
pg/mL
 
Observações gerais:\tnada
 
CK-MB
Material:
Soro
 
Resultado
18
 
U/L
 
Observações gerais:\tnada
`;

describe("exames acrescentados", () => {
  it("lê cada um do seu próprio bloco", () => {
    const saida = formatarLabs(AFIP_NOVOS);
    expect(saida).toContain("RETIC 3,4");
    expect(saida).toContain("PCT 12,60");
    expect(saida).toContain("AU 9,1");
    expect(saida).toContain("CL 112");
    expect(saida).toContain("FIB 680");
    expect(saida).toContain("DDIM 4,80");
  });

  it("cálcio total e cálcio iônico não trocam de valor", () => {
    const saida = formatarLabs(AFIP_NOVOS);
    expect(saida).toContain("CA 7,4");
    expect(saida).toContain("CAI 0,92");
  });

  it("o NT-proBNP não é lido como BNP", () => {
    const saida = formatarLabs(AFIP_NOVOS);
    expect(saida).toContain("NTPROBNP 3.210");
    expect(saida).not.toMatch(/\bBNP 3\.210/);
  });

  it("a CK total não herda o valor da CK-MB", () => {
    // "\bCK\b" casa com o CK de "CK-MB" — o hífen fecha palavra.
    const saida = formatarLabs(AFIP_NOVOS);
    expect(saida).toContain("CKMB 18");
    expect(saida).not.toContain("CK 18");
  });
});
