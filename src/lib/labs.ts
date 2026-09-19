/**
 * Formatador de laudos laboratoriais — porte do `formatar_labs` do PS.py.
 *
 * Recebe o texto bruto colado do SHIFT/AFIP e devolve a linha compacta
 * "LABS dd/mm/aaaa: HB 13,4 | HT 40 | PLAQ 322.000 | ...".
 *
 * O porte é fiel ao original, com uma correção: no Python a creatinina era
 * adicionada duas vezes (uma no bloco específico, outra no bloco de
 * bioquímica), então saía duplicada na linha final. Aqui cada rótulo entra
 * uma vez só — ver `adicionar`.
 */

/**
 * Número pt-BR. O primeiro ramo exige PELO MENOS um grupo ".ddd", senão
 * "25000" casaria apenas "250" — que era o bug do original: 25.000 leucócitos
 * na urina viravam 250 na linha final.
 */
const NUM = String.raw`(?:\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)`;

/** "1.234,5" (pt-BR) -> 1234.5 */
export function paraNumero(s: string): number {
  const limpo = s.replace(/\s+/g, "");
  if (limpo.includes(",")) {
    return parseFloat(limpo.replace(/\./g, "").replace(",", "."));
  }
  return parseFloat(limpo.replace(/\./g, ""));
}

/** Reformata mantendo as casas decimais que vieram no laudo. */
export function formatarNumero(original: string, valor: number): string {
  if (original.includes(",")) {
    const casas = original.split(",")[1].length;
    return valor.toFixed(casas).replace(".", ",");
  }
  return Number.isInteger(valor)
    ? String(valor)
    : String(valor).replace(".", ",");
}

/** 322000 -> "322.000" */
export function milhar(n: number): string {
  return Math.round(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

/**
 * Data da COLETA, com o ano inteiro — é ela que abre a linha, não a data em
 * que o laudo foi liberado nem a de hoje.
 */
export function dataDaColeta(texto: string): string {
  let m = texto.match(/COLETA:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!m) m = texto.match(/(\d{2})\/(\d{2})\/(\d{4})\s*-\s*\d{2}:\d{2}:\d{2}/);
  if (!m) return "__/__/____";
  return `${m[1]}/${m[2]}/${m[3]}`;
}

function buscar(texto: string, padrao: string, flags = "is"): RegExpMatchArray | null {
  return texto.match(new RegExp(padrao, flags));
}

/** Número que aparece logo depois do rótulo (SHIFT quebra a linha no meio). */
function extrairNumero(texto: string, rotulos: string[]): string | null {
  for (const r of rotulos) {
    const m = buscar(texto, `${r}(?:\\s*[:\\-])?\\s*[\\r\\n]+[\\s\\S]*?(${NUM})`);
    if (m) return m[1];
  }
  return null;
}

/**
 * O valor que vem depois de um rótulo, na mesma linha ou na primeira linha
 * com conteúdo abaixo dele.
 *
 * É assim que o SHIFT monta a tabela — rótulo numa linha, resultado na
 * seguinte, referência mais abaixo — e ler exatamente isso é o que impede de
 * cair na coluna de referência. Procurar "o primeiro qualitativo depois do
 * rótulo" não bastava: com "Proteína / + / Valor de referência: Negativo",
 * o "+" era pulado e o NEGATIVO da referência entrava no lugar.
 */
function valorDoRotulo(texto: string, rotulo: string): string | null {
  const m = buscar(texto, `^(.*?${rotulo}[^\\S\\r\\n]*:?[^\\S\\r\\n]*)(.*)$`, "im");
  if (!m || m.index === undefined) return null;

  const limpar = (l: string) => l.replace(/\u00a0/g, " ").trim();

  const mesmaLinha = limpar(m[2]);
  if (mesmaLinha) return mesmaLinha;

  for (const linha of texto.slice(m.index + m[0].length).split(/\r?\n/)) {
    const v = limpar(linha);
    if (v) return v;
  }
  return null;
}

/**
 * Cruzes com ou sem espaço entre elas: o laudo escreve "+", "++" e também
 * "+ +" dependendo de como a página é copiada.
 */
const CRUZES = String.raw`\+(?:\s*\+){0,3}`;
const QUALITATIVOS = String.raw`NEGATIV[OA]|POSITIV[OA]|TRACOS?|TRACE|AUSENTE|PRESENTE|${CRUZES}`;

function extrairQualitativo(texto: string, rotulos: string[]): string | null {
  for (const r of rotulos) {
    const valor = valorDoRotulo(texto, r);
    if (!valor) continue;

    // Ancorado no começo do valor: é o resultado, não algo mais à frente.
    const m = valor.match(new RegExp(`^(${QUALITATIVOS})`, "i"));
    if (!m) continue;

    return m[1]
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace("TRACE", "TRACO")
      .replace("TRACOS", "TRACO");
  }
  return null;
}

/** NEGATIVO/AUSENTE são normais; o resto conta como alterado. */
export function qualitativoAlterado(v: string | null): boolean {
  if (!v) return false;
  const up = v.toUpperCase();
  if (up === "NEGATIVO" || up === "AUSENTE") return false;
  return true;
}

/** Títulos que marcam o começo de outro exame — usados para cortar o bloco. */
const PROXIMO_EXAME = String.raw`\n(?:HEMOGRAMA|URINA I|UREIA|CREATININA|TFG\s*-|S[ÓO]DIO|POT[ÁA]SSIO|PROTE[ÍI]NA C REATIVA|TGO\/AST|TGP\/ALT|TROPONINA|BILIRRUBINA|ALBUMINA|FOSFATASE|GGT|DHL|TP\b|INR\b|TTPA\b)\b`;

/**
 * Pega o número que vem depois da palavra RESULTADO *dentro* do bloco daquele
 * exame. É o que evita capturar valor de exame antigo ou eixo de gráfico.
 */
function resultadoPorTitulo(texto: string, titulos: string[]): string | null {
  for (const titulo of titulos) {
    const m = buscar(texto, `(${titulo})([\\s\\S]{0,6000})`);
    if (!m) continue;

    let bloco = m[2];
    const corte = bloco.match(new RegExp(PROXIMO_EXAME, "i"));
    if (corte && corte.index !== undefined) bloco = bloco.slice(0, corte.index);

    const r = bloco.match(new RegExp(`\\bRESULTADO\\b\\s*[\\r\\n]+?\\s*(${NUM})\\b`, "i"));
    if (r) return r[1];

    // Alguns laudos não destacam a palavra RESULTADO na própria linha.
    const r2 = bloco.match(new RegExp(`\\bRESULTADO\\b[\\s\\S]*?(${NUM})`, "i"));
    if (r2) return r2[1];
  }
  return null;
}

/**
 * Recorta só a seção da URINA I, para não confundir leucócito de urina com o
 * do hemograma. Sem seção de urina devolve vazio: o original devolvia o texto
 * inteiro, e aí o leucograma era reimpresso como se fosse leucocitúria.
 */
function blocoUrina1(texto: string): string {
  const low = texto.toLowerCase();
  const ini = low.indexOf("urina i");
  if (ini === -1) return "";

  let fim = texto.length;
  for (const c of ["problema ao visualizar", "copyright", "navegadores compatíveis", "\n\n"]) {
    const j = low.indexOf(c, ini);
    if (j !== -1) fim = Math.min(fim, j);
  }
  return texto.slice(ini, fim);
}

export function formatarLabs(textoBruto: string | null | undefined): string {
  if (!textoBruto || !textoBruto.trim()) return "";

  const t = textoBruto.toUpperCase();
  const data = dataDaColeta(t);

  // O hemograma é lido de um texto SEM a seção de urina. Sem isso, um laudo
  // só de urina gerava leucograma fantasma a partir da leucocitúria.
  const tUr = blocoUrina1(t);
  const tSangue = tUr ? t.replace(tUr, "\n") : t;
  const partes: string[] = [];
  const jaAdicionado = new Set<string>();

  /** Cada rótulo entra uma vez só — corrige a duplicação de CR do original. */
  function adicionar(rotulo: string, valorStr: string | null) {
    if (!valorStr || jaAdicionado.has(rotulo)) return;
    const n = paraNumero(valorStr);
    if (Number.isNaN(n)) return;
    jaAdicionado.add(rotulo);
    partes.push(`${rotulo} ${formatarNumero(valorStr, n)}`);
  }

  // ===== HEMOGRAMA =====
  const hb = extrairNumero(tSangue, [String.raw`HEMOGLOBINA`]);
  const ht = extrairNumero(tSangue, [String.raw`HEMAT[ÓO]CRITO`]);
  const plaq = extrairNumero(tSangue, [String.raw`PLAQUETAS`]);
  const leuc = extrairNumero(tSangue, [String.raw`LEUC[ÓO]CITOS`]);
  const neut = extrairNumero(tSangue, [String.raw`NEUTR[ÓO]FILOS`]);
  const bast = extrairNumero(tSangue, [String.raw`BASTONETES`]);

  adicionar("HB", hb);
  adicionar("HT", ht);

  if (plaq) {
    // SHIFT informa em Mil/mm3 ("322"), que vira 322.000.
    const v = paraNumero(plaq);
    if (!Number.isNaN(v)) {
      jaAdicionado.add("PLAQ");
      partes.push(`PLAQ ${milhar(v * 1000)}`);
    }
  }

  if (leuc) {
    const v = paraNumero(leuc);
    if (!Number.isNaN(v)) {
      const total = v < 100 ? v * 1000 : v;
      const bastN = bast ? paraNumero(bast) : NaN;
      const temDesvio = !Number.isNaN(bastN) && bastN > 0;

      partes.push(`LEUC ${milhar(total)}${temDesvio ? "" : " SEM DESVIO"}`);
      jaAdicionado.add("LEUC");

      if (temDesvio) {
        adicionar("NEUT", neut);
        partes.push(`BAST ${formatarNumero(bast!, bastN)}`);
        jaAdicionado.add("BAST");
      }
    }
  }

  // ===== BIOQUÍMICA / ELETRÓLITOS =====
  // A creatinina tem um padrão próprio no SHIFT: título, depois a linha repetida.
  const mcr = buscar(t, String.raw`\bCREATININA\b[\s\S]{0,1200}?\n\s*CREATININA\s*[\r\n]+?\s*(\d+(?:,\d+)?)\b`);
  adicionar("UR", resultadoPorTitulo(t, [String.raw`\bUR[EÉ]IA\b`]));
  adicionar("CR", mcr ? mcr[1] : resultadoPorTitulo(t, [String.raw`\bCREATININA\b`]));
  adicionar("TFG", resultadoPorTitulo(t, [String.raw`\bTFG\b`, String.raw`FILTRA[ÇC][ÃA]O\s*GLOMERULAR`]));
  adicionar("NA", resultadoPorTitulo(t, [String.raw`\bS[ÓO]DIO\b`]));
  adicionar("K", resultadoPorTitulo(t, [String.raw`\bPOT[ÁA]SSIO\b`]));
  adicionar("GLI", resultadoPorTitulo(t, [String.raw`\bGLICOSE\b`]));
  adicionar("CA", resultadoPorTitulo(t, [String.raw`\bC[ÁA]LCIO\b`]));
  adicionar("MG", resultadoPorTitulo(t, [String.raw`\bMAGN[ÉE]SIO\b`]));
  adicionar("P", resultadoPorTitulo(t, [String.raw`\bF[ÓO]SFORO\b`, String.raw`\bFOSFATO\b`]));

  // ===== HEPÁTICA / ENZIMAS / INFLAMAÇÃO =====
  adicionar("PCR", resultadoPorTitulo(t, [String.raw`PROTE[ÍI]NA\s*C\s*REATIVA\s*-\s*PCR`, String.raw`\bPCR\b`]));
  adicionar("TGO", resultadoPorTitulo(t, [String.raw`TGO\/AST`, String.raw`\bAST\b`]));
  adicionar("TGP", resultadoPorTitulo(t, [String.raw`TGP\/ALT`, String.raw`\bALT\b`]));
  adicionar("FA", resultadoPorTitulo(t, [String.raw`FOSFATASE\s+ALCALINA`, String.raw`\bFA\b`]));
  adicionar("GGT", resultadoPorTitulo(t, [String.raw`\bGGT\b`, String.raw`GAMA\s*GT`, String.raw`GAMAGT`]));
  adicionar("DHL", resultadoPorTitulo(t, [String.raw`\bDHL\b`, String.raw`DESIDROGENASE\s+L[ÁA]CTICA`]));
  adicionar("BT", resultadoPorTitulo(t, [String.raw`BILIRRUBINA\s*TOTAL`]));
  adicionar("BD", resultadoPorTitulo(t, [String.raw`BILIRRUBINA\s*DIRETA`]));
  adicionar("BI", resultadoPorTitulo(t, [String.raw`BILIRRUBINA\s*INDIRETA`]));
  adicionar("ALB", resultadoPorTitulo(t, [String.raw`\bALBUMINA\b`]));

  // ===== COAGULAÇÃO =====
  adicionar("TP", resultadoPorTitulo(t, [String.raw`\bTP\b`, String.raw`TEMPO\s+DE\s+PROTROMBINA`]));
  adicionar("INR", resultadoPorTitulo(t, [String.raw`\bINR\b`]));
  adicionar("TTPA", resultadoPorTitulo(t, [String.raw`\bTTPA\b`, String.raw`TEMPO\s+DE\s+TROMBOPLASTINA`]));

  // ===== OUTROS =====
  adicionar("AMIL", resultadoPorTitulo(t, [String.raw`\bAMILASE\b`]));
  adicionar("LIPA", resultadoPorTitulo(t, [String.raw`\bLIPASE\b`]));
  adicionar("CK", resultadoPorTitulo(t, [String.raw`\bCK\b`, String.raw`CREATINOQUINASE`]));
  adicionar("CKMB", resultadoPorTitulo(t, [String.raw`\bCKMB\b`, String.raw`CK-MB`]));
  adicionar("LAC", resultadoPorTitulo(t, [String.raw`\bLACTATO\b`]));
  adicionar("TROP", resultadoPorTitulo(t, [
    String.raw`TROPONINA\s+I[\s\S]{0,40}ALTA\s+SENSIBILIDADE`,
    String.raw`\bHS\s*TNI\b`,
    String.raw`\bTNI\b`,
  ]));

  // ===== URINA I — pH sempre, o resto só se alterado =====
  const ur1: string[] = [];

  /**
   * O valor do sedimento como o laboratório escreveu, mais o número que serve
   * para decidir se é alterado.
   *
   * O laudo nem sempre traz um número solto: "2,0 a 5,0" é uma faixa, e
   * "SUPERIOR A 1.000.000" é um limite. Transcrever só o primeiro número
   * dessas formas ("BACT 2,0") diz uma coisa diferente do que o laboratório
   * reportou, então o texto vai inteiro e a comparação usa o menor valor.
   */
  const ur1Valor = (rotulo: string): { texto: string; numero: number } | null => {
    const valor = valorDoRotulo(tUr, rotulo);
    if (!valor) return null;

    const faixa = valor.match(new RegExp(`^(${NUM})\\s+A\\s+(${NUM})\\b`, "i"));
    if (faixa) return { texto: `${faixa[1]} a ${faixa[2]}`, numero: paraNumero(faixa[1]) };

    const limite = valor.match(new RegExp(`^(?:SUPERIOR\\s+A|MAIOR\\s+QUE|>)\\s*(${NUM})`, "i"));
    if (limite) return { texto: `>${limite[1]}`, numero: paraNumero(limite[1]) };

    const simples = valor.match(new RegExp(`^(${NUM})`));
    if (simples) return { texto: simples[1], numero: paraNumero(simples[1]) };

    return null;
  };

  const ph = ur1Valor(String.raw`\bPH\b`);
  if (ph && !Number.isNaN(ph.numero)) ur1.push(`PH ${ph.texto}`);

  const qualis: [string, string[]][] = [
    ["PROT", [String.raw`\bPROTE[ÍI]NA\b`]],
    ["CET", [String.raw`\bCETONA\b`, String.raw`\bCETONAS\b`]],
    ["SANG", [String.raw`\bSANGUE\b`]],
    ["NITRITO", [String.raw`\bNITRITO\b`]],
  ];
  for (const [rotulo, padroes] of qualis) {
    const v = extrairQualitativo(tUr, padroes);
    if (qualitativoAlterado(v)) ur1.push(`${rotulo} ${v}`);
  }

  const leuUr = ur1Valor(String.raw`\bLEUC[ÓO]CITOS\b`);
  if (leuUr) ur1.push(`LEUC ${leuUr.texto}`);

  // Hemácias: só quando passa da referência do laudo (até 20.000/mL).
  const hemUr = ur1Valor(String.raw`\bHEM[ÁA]CIAS\b`);
  if (hemUr && hemUr.numero > 20000) ur1.push(`HEM ${hemUr.texto}`);

  // Bactérias: só a partir de 1,0.
  const bactUr = ur1Valor(String.raw`\bBACT[ÉE]RIAS\b`);
  if (bactUr && bactUr.numero >= 1.0) ur1.push(`BACT ${bactUr.texto}`);

  const lev = extrairQualitativo(tUr, [String.raw`\bLEVEDURAS\b`]);
  if (qualitativoAlterado(lev)) ur1.push(`LEVED ${lev}`);

  if (ur1.length) partes.push(`UR1 ${ur1.join(" ")}`);

  if (!partes.length) return "";
  // Separador "|" e não "/": as datas e as unidades do laudo já têm barra, e
  // "UR 65,0 / CR 1,20" ficava ambíguo na leitura corrida do prontuário.
  return `LABS ${data}: ${partes.join(" | ")}`;
}
