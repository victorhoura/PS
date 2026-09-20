/**
 * Formatador de laudos laboratoriais — porte do `formatar_labs` do PS.py.
 *
 * Recebe o texto bruto colado do SHIFT/AFIP e devolve a linha compacta
 * "LABS dd/mm/aaaa: HB 13,4 | HT 40 | PLAQ 322.000 | ...".
 *
 * COMO O LAUDO É LIDO
 *
 * A página da AFIP tem uma forma só, repetida exame a exame: um título de
 * seção, um cabeçalho (Material / Coleta / Método / Liberação), e então as
 * linhas de valor — rótulo numa linha, resultado na seguinte, unidade e
 * referência abaixo. O que muda é o rótulo do valor: exames de um analito só
 * escrevem "Resultado", e os demais escrevem o nome do próprio analito
 * ("Bilirrubina Total", "Primeira hora", "Proteínas", "Base Exces").
 *
 * Este arquivo lê as duas formas. Antes lia só a primeira, e por isso
 * bilirrubinas, albumina, proteínas, VHS e a gasometria inteira sumiam do
 * prontuário sem avisar — some calado é o pior jeito de errar num laudo.
 *
 * A leitura é sempre em duas etapas: recortar o bloco daquele exame e só
 * então procurar o rótulo dentro dele. Sem o recorte, um "Resultado" do exame
 * seguinte responde pelo anterior, e o pH da gasometria e o da urina se
 * confundem.
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

// ------------------------------------------------------------ valores

/** Um resultado como ele entra no prontuário, mais o número que o compara. */
export interface Valor {
  /** Texto transcrito: pode ser ">90" ou "2,0 a 5,0", não só um número. */
  texto: string;
  /** Para comparar com um limiar. Numa faixa, é o menor valor. */
  numero: number;
}

function limpar(linha: string): string {
  return linha.replace(/ /g, " ").trim();
}

/**
 * Interpreta uma célula do laudo.
 *
 * O laboratório nem sempre devolve um número solto: "Superior a 90" é um
 * limite e "2,0 a 5,0" é uma faixa. Transcrever só o primeiro número dessas
 * formas diz outra coisa — "TFG 90" é o piso do normal, "TFG >90" é normal —
 * então o texto vai inteiro e a comparação usa o menor valor.
 *
 * O sinal faz parte do número: sem ele o "Base Exces -0,6" da gasometria
 * sairia como 0,6 e uma acidose seria lida como normal.
 */
function lerValor(bruto: string): Valor | null {
  const v = limpar(bruto);
  if (!v) return null;

  // Uma data não é resultado de nada — corta antes de "19/09/2026" virar 19.
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(v)) return null;
  // "1,8 - 7,70" é intervalo de referência, não valor encontrado.
  if (new RegExp(`^${NUM}\\s*-\\s*${NUM}`).test(v)) return null;

  const faixa = v.match(new RegExp(`^(${NUM})\\s+A\\s+(${NUM})\\b`, "i"));
  if (faixa) return { texto: `${faixa[1]} a ${faixa[2]}`, numero: paraNumero(faixa[1]) };

  const acima = v.match(new RegExp(`^(?:SUPERIOR\\s+A|MAIOR\\s+QUE|ACIMA\\s+DE|>)\\s*(${NUM})`, "i"));
  if (acima) return { texto: `>${acima[1]}`, numero: paraNumero(acima[1]) };

  const abaixo = v.match(
    new RegExp(`^(?:INFERIOR\\s+A|MENOR\\s+QUE|ABAIXO\\s+DE|<)\\s*(${NUM})`, "i"),
  );
  if (abaixo) return { texto: `<${abaixo[1]}`, numero: paraNumero(abaixo[1]) };

  const simples = v.match(new RegExp(`^(-?${NUM})`));
  if (!simples) return null;
  const n = paraNumero(simples[1]);
  if (Number.isNaN(n)) return null;
  // O texto vai como o laudo escreveu: é o que preserva "0,70" e "14.000".
  return { texto: simples[1], numero: n };
}

/**
 * Os valores que podem pertencer a um rótulo: o que sobra na própria linha e
 * a primeira linha com conteúdo abaixo dela. Ler exatamente isso é o que
 * impede de cair na coluna de referência, que vem logo em seguida.
 *
 * Percorre TODAS as ocorrências do rótulo porque o título da seção costuma
 * repetir o nome do exame — "Dosagem sérica de Creatinina" e depois
 * "Creatinina / 0,70". A primeira ocorrência não tem valor; a segunda tem.
 * E a linha do rótulo às vezes continua com algo que não é o resultado
 * ("Bicarbonato(HCO3)"), daí valerem as duas posições.
 *
 * O rótulo precisa ABRIR a linha. Sem essa âncora, a nota de rodapé do
 * potássio — "concentracoes elevadas de potassio" — era lida como rótulo, e
 * o valor vinha da série do gráfico logo abaixo: 5,3 no lugar de 3,8. Rótulo
 * de verdade começa a linha; nome no meio de uma frase é texto corrido.
 */
function* candidatos(texto: string, rotulo: string): Generator<string> {
  const re = new RegExp(`^([^\\S\\r\\n]*${rotulo}[^\\S\\r\\n]*:?[^\\S\\r\\n]*)(.*)$`, "gim");
  for (const m of texto.matchAll(re)) {
    if (m.index === undefined) continue;

    const resto = limpar(m[2]);
    if (resto) yield resto;

    for (const linha of texto.slice(m.index + m[0].length).split(/\r?\n/)) {
      const v = limpar(linha);
      if (v) {
        yield v;
        break;
      }
    }
  }
}

function valorDoRotulo(texto: string, rotulo: string): Valor | null {
  for (const c of candidatos(texto, rotulo)) {
    const v = lerValor(c);
    if (v) return v;
  }
  return null;
}

/**
 * As colunas numéricas que seguem um rótulo, uma por linha.
 *
 * O leucograma da AFIP imprime o diferencial em duas: porcentagem e valor
 * absoluto em Mil/mm3. A referência vem logo depois e nunca é um número
 * sozinho ("1,8 - 7,70") — é isso que delimita a leitura.
 */
function colunas(texto: string, rotulo: string): string[] {
  const m = texto.match(new RegExp(`^[^\\S\\r\\n]*${rotulo}[^\\S\\r\\n]*:?[^\\S\\r\\n]*$`, "im"));
  if (!m || m.index === undefined) return [];

  const saida: string[] = [];
  const soNumero = new RegExp(`^-?${NUM}$`);
  for (const linha of texto.slice(m.index + m[0].length).split(/\r?\n/)) {
    const v = limpar(linha);
    if (!v) continue;
    if (!soNumero.test(v)) break;
    saida.push(v);
  }
  return saida;
}

/**
 * Cruzes com ou sem espaço entre elas: o laudo escreve "+", "++" e também
 * "+ +" dependendo de como a página é copiada.
 */
const CRUZES = String.raw`\+(?:\s*\+){0,3}`;
const QUALITATIVOS = String.raw`NEGATIV[OA]|POSITIV[OA]|TRACOS?|TRACE|AUSENTE|PRESENTE|${CRUZES}`;

function extrairQualitativo(texto: string, rotulos: string[]): string | null {
  for (const r of rotulos) {
    for (const c of candidatos(texto, r)) {
      // Ancorado no começo do valor: é o resultado, não algo mais à frente.
      const m = c.match(new RegExp(`^(${QUALITATIVOS})`, "i"));
      if (!m) continue;

      return m[1]
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace("TRACE", "TRACO")
        .replace("TRACOS", "TRACO");
    }
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

// ------------------------------------------------------------- blocos

/**
 * O que encerra o bloco de um exame.
 *
 * Duas famílias. As marcas de estrutura (a régua de sublinhados, a
 * assinatura, o "Observações gerais") fecham a seção inteira e valem para
 * qualquer exame, inclusive os que ainda não conhecemos. Os títulos servem
 * para separar analitos que dividem a mesma seção — as três bilirrubinas, ou
 * proteínas / albumina / globulina / relação.
 */
const TITULOS_DE_CORTE = [
  String.raw`HEMOGRAMA`,
  String.raw`URINA I`,
  String.raw`RETICUL[ÓO]CITOS`,
  String.raw`VELOCIDADE\s+DE\s+HEMOSSEDIMENTA`,
  String.raw`GASOMETRIA`,
  String.raw`UR[EÉ]IA`,
  String.raw`CREATININA`,
  String.raw`TFG\s*-`,
  String.raw`[ÁA]CIDO\s+[ÚU]RICO`,
  String.raw`S[ÓO]DIO`,
  String.raw`POT[ÁA]SSIO`,
  String.raw`CLORETOS?`,
  String.raw`MAGN[ÉE]SIO`,
  String.raw`F[ÓO]SFORO`,
  String.raw`C[ÁA]LCIO\s+I[ÔO]NICO`,
  String.raw`C[ÁA]LCIO\s+IONIZADO`,
  String.raw`PROTE[ÍI]NA C REATIVA`,
  String.raw`PROCALCITONINA`,
  String.raw`PROTE[ÍI]NA\s+TOTAL`,
  String.raw`GLOBULINA`,
  String.raw`RELA[ÇC][ÃA]O`,
  String.raw`TGO\/AST`,
  String.raw`TGP\/ALT`,
  String.raw`TROPONINA`,
  String.raw`BILIRRUBINA`,
  String.raw`ALBUMINA`,
  String.raw`FOSFATASE`,
  String.raw`GGT\b`,
  String.raw`DHL\b`,
  String.raw`TP\b`,
  String.raw`INR\b`,
  String.raw`TTPA\b`,
  String.raw`FIBRINOG[ÊE]NIO`,
  String.raw`D-?D[ÍI]MERO`,
  String.raw`\bBNP\b`,
  String.raw`NT-?PRO\s*BNP`,
];

/** Marcas de estrutura: valem para qualquer exame, inclusive os desconhecidos. */
const FIM_ESTRUTURAL = String.raw`_{5,}|OBSERVA[ÇC][ÃAÕO]|EXAME\s+ASSINADO|LIBERADO\s+POR`;

function fimDoBloco(titulos: string[]): RegExp {
  return new RegExp(`\\n[^\\S\\r\\n]*(?:${FIM_ESTRUTURAL}|${titulos.join("|")})`, "i");
}

/** Do título do exame até onde ele acaba. Inclui o título: às vezes é ele que rotula o valor. */
function blocoDoExame(texto: string, titulo: string): string | null {
  const m = texto.match(new RegExp(titulo, "i"));
  if (!m || m.index === undefined) return null;

  /**
   * O nome do próprio exame não pode encerrar o bloco dele. A AFIP intitula
   * a seção "Dosagem sérica de Creatinina" e só depois rotula a linha do
   * valor com "Creatinina": cortar ali deixava o bloco com o cabeçalho e
   * nenhum resultado, e a creatinina sumia da transcrição.
   */
  const corte = fimDoBloco(
    TITULOS_DE_CORTE.filter((p) => !new RegExp(`^(?:${p})$`, "i").test(m[0])),
  );

  const depois = texto.slice(m.index + m[0].length);
  const fim = depois.match(corte);
  return m[0] + (fim && fim.index !== undefined ? depois.slice(0, fim.index) : depois);
}

/**
 * O valor de um exame: acha o bloco pelo título e procura o rótulo dentro
 * dele. Os rótulos explícitos vêm primeiro, depois o próprio título (é o que
 * resolve "Bilirrubina Total / 0,40") e só então "Resultado".
 */
function valorDoExame(texto: string, titulos: string[], rotulos: string[] = []): Valor | null {
  for (const titulo of titulos) {
    const bloco = blocoDoExame(texto, titulo);
    if (!bloco) continue;

    for (const r of [...rotulos, titulo, String.raw`RESULTADO`]) {
      const v = valorDoRotulo(bloco, r);
      if (v) return v;
    }
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

// --------------------------------------------------------- gasometria

/**
 * A gasometria não tem "Resultado": cada gás é rotulado pelo próprio nome, e
 * o bicarbonato vem como "Bicarbonato(HCO3)", com a sigla grudada no rótulo.
 * Sai agrupada numa parte só, como a urina, porque seis números soltos no
 * meio da linha não se leem como gasometria.
 */
const GASOMETRIA: [string, string][] = [
  ["PH", String.raw`\bPH\b`],
  ["PO2", String.raw`\bPO2\b`],
  ["PCO2", String.raw`\bPCO2\b`],
  ["HCO3", String.raw`BICARBONATO|\bHCO3\b`],
  ["BE", String.raw`BASE\s*EXCES|\bBE\b`],
  ["SAT", String.raw`SATURA[ÇC][ÃA]O\s*(?:DE\s*)?O2|\bSAT\s*O2\b`],
];

function lerGasometria(texto: string, titulo: string): string | null {
  const bloco = blocoDoExame(texto, titulo);
  if (!bloco) return null;

  const itens: string[] = [];
  for (const [rotulo, padrao] of GASOMETRIA) {
    const v = valorDoRotulo(bloco, padrao);
    if (v) itens.push(`${rotulo} ${v.texto}`);
  }
  return itens.length ? itens.join(" ") : null;
}

// ---------------------------------------------------------- formatação

export function formatarLabs(textoBruto: string | null | undefined): string {
  if (!textoBruto || !textoBruto.trim()) return "";

  const t = textoBruto.toUpperCase();
  const data = dataDaColeta(t);

  // O hemograma é lido de um texto SEM a seção de urina. Sem isso, um laudo
  // só de urina gerava leucograma fantasma a partir da leucocitúria — e o pH
  // da gasometria seria lido do sedimento.
  const tUr = blocoUrina1(t);
  const tSangue = tUr ? t.replace(tUr, "\n") : t;
  const partes: string[] = [];
  const jaAdicionado = new Set<string>();

  /** Cada rótulo entra uma vez só — corrige a duplicação de CR do original. */
  function adicionar(rotulo: string, v: Valor | null) {
    if (!v || jaAdicionado.has(rotulo)) return;
    jaAdicionado.add(rotulo);
    partes.push(`${rotulo} ${v.texto}`);
  }

  const exame = (rotulo: string, titulos: string[], rotulos: string[] = []) =>
    adicionar(rotulo, valorDoExame(tSangue, titulos, rotulos));

  // ===== HEMOGRAMA =====
  const hb = valorDoRotulo(tSangue, String.raw`HEMOGLOBINA(?!\s*CORPUSCULAR)`);
  const ht = valorDoRotulo(tSangue, String.raw`HEMAT[ÓO]CRITO`);
  const plaq = valorDoRotulo(tSangue, String.raw`PLAQUETAS`);
  const leuc = valorDoRotulo(tSangue, String.raw`LEUC[ÓO]CITOS`);

  adicionar("HB", hb);
  adicionar("HT", ht);

  if (plaq) {
    // SHIFT informa em Mil/mm3 ("322"), que vira 322.000. Laudo que já traz o
    // valor absoluto passa direto — multiplicar de novo daria 322 milhões.
    jaAdicionado.add("PLAQ");
    partes.push(`PLAQ ${milhar(plaq.numero < 1000 ? plaq.numero * 1000 : plaq.numero)}`);
  }

  if (leuc) {
    const total = leuc.numero < 100 ? leuc.numero * 1000 : leuc.numero;

    /**
     * O diferencial da AFIP vem em duas colunas — porcentagem e absoluto em
     * Mil/mm3 — e ler a errada troca 68,7% por 7,72 mil neutrófilos. Só
     * tratamos como duas quando o próprio laudo declara as colunas.
     */
    const duasColunas = /\(%\)/.test(tSangue) && /MIL\/MM3/.test(tSangue);
    const celulas = (rotulo: string): string | null => {
      const cols = colunas(tSangue, rotulo);
      if (duasColunas && cols.length >= 2) return `${cols[1]} (${cols[0]}%)`;
      if (cols.length) return cols[0];
      return valorDoRotulo(tSangue, rotulo)?.texto ?? null;
    };

    const bastCols = colunas(tSangue, String.raw`BASTONETES`);
    const bastBruto = bastCols[0] ?? valorDoRotulo(tSangue, String.raw`BASTONETES`)?.texto ?? null;
    const temDesvio = bastBruto !== null && paraNumero(bastBruto) > 0;

    partes.push(`LEUC ${milhar(total)}${temDesvio ? "" : " SEM DESVIO"}`);
    jaAdicionado.add("LEUC");

    if (temDesvio) {
      const neut = celulas(String.raw`NEUTR[ÓO]FILOS`);
      if (neut) {
        partes.push(`NEUT ${neut}`);
        jaAdicionado.add("NEUT");
      }
      partes.push(`BAST ${celulas(String.raw`BASTONETES`)}`);
      jaAdicionado.add("BAST");
    }
  }

  exame("RETIC", [String.raw`RETICUL[ÓO]CITOS`]);

  // ===== BIOQUÍMICA / ELETRÓLITOS =====
  exame("UR", [String.raw`\bUR[EÉ]IA\b`]);
  exame("CR", [String.raw`\bCREATININA\b`]);
  exame("TFG", [String.raw`\bTFG\b`, String.raw`FILTRA[ÇC][ÃA]O\s*GLOMERULAR`]);
  exame("AU", [String.raw`[ÁA]CIDO\s+[ÚU]RICO`]);
  exame("NA", [String.raw`\bS[ÓO]DIO\b`]);
  exame("K", [String.raw`\bPOT[ÁA]SSIO\b`]);
  exame("CL", [String.raw`\bCLORETOS?\b`, String.raw`\bCLORO\b`]);
  exame("GLI", [String.raw`\bGLICOSE\b`]);
  // O cálcio total não pode casar com o iônico: são valores e faixas diferentes.
  exame("CA", [
    String.raw`C[ÁA]LCIO\s+TOTAL`,
    String.raw`\bC[ÁA]LCIO\b(?!\s*(?:I[ÔO]NICO|IONIZADO))`,
  ]);
  exame("CAI", [String.raw`C[ÁA]LCIO\s+I[ÔO]NICO`, String.raw`C[ÁA]LCIO\s+IONIZADO`]);
  exame("MG", [String.raw`\bMAGN[ÉE]SIO\b`]);
  exame("P", [String.raw`\bF[ÓO]SFORO\b`, String.raw`\bFOSFATO\b`]);

  // ===== HEPÁTICA / ENZIMAS / INFLAMAÇÃO =====
  exame("PCR", [String.raw`PROTE[ÍI]NA\s*C\s*REATIVA\s*-\s*PCR`, String.raw`\bPCR\b`]);
  // O VHS rotula o valor de "Primeira hora" — nunca de "Resultado".
  exame(
    "VHS",
    [String.raw`VELOCIDADE\s+DE\s+HEMOSSEDIMENTA[ÇC][ÃA]O`, String.raw`\bVHS\b`],
    [String.raw`PRIMEIRA\s+HORA`],
  );
  exame("PCT", [String.raw`\bPROCALCITONINA\b`]);
  exame("TGO", [String.raw`TGO\/AST`, String.raw`\bAST\b`]);
  exame("TGP", [String.raw`TGP\/ALT`, String.raw`\bALT\b`]);
  exame("FA", [String.raw`FOSFATASE\s+ALCALINA`, String.raw`\bFA\b`]);
  exame("GGT", [String.raw`\bGGT\b`, String.raw`GAMA\s*GT`, String.raw`GAMAGT`]);
  exame("DHL", [String.raw`\bDHL\b`, String.raw`DESIDROGENASE\s+L[ÁA]CTICA`]);
  exame("BT", [String.raw`BILIRRUBINA\s*TOTAL`]);
  exame("BD", [String.raw`BILIRRUBINA\s*DIRETA`]);
  exame("BI", [String.raw`BILIRRUBINA\s*INDIRETA`]);
  exame("ALB", [String.raw`\bALBUMINA\b`]);
  exame("PTOT", [String.raw`PROTE[ÍI]NA\s+TOTAL`], [String.raw`PROTE[ÍI]NAS\b`]);
  exame("GLOB", [String.raw`\bGLOBULINA\b`]);
  exame("A/G", [String.raw`RELA[ÇC][ÃA]O\s+ALBUMINA`]);

  // ===== COAGULAÇÃO =====
  exame("TP", [String.raw`\bTP\b`, String.raw`TEMPO\s+DE\s+PROTROMBINA`]);
  exame("INR", [String.raw`\bINR\b`]);
  exame("TTPA", [String.raw`\bTTPA\b`, String.raw`TEMPO\s+DE\s+TROMBOPLASTINA`]);
  exame("FIB", [String.raw`\bFIBRINOG[ÊE]NIO\b`]);
  exame("DDIM", [String.raw`\bD-?\s?D[ÍI]MERO\b`]);

  // ===== OUTROS =====
  exame("AMIL", [String.raw`\bAMILASE\b`]);
  exame("LIPA", [String.raw`\bLIPASE\b`]);
  // A CK não pode casar com a CK-MB: "\bCK\b" pega o CK de "CK-MB", porque o
  // hífen também fecha palavra, e a massa total sairia com o valor da fração.
  exame("CK", [String.raw`\bCK\b(?!\s*-?\s*MB)`, String.raw`CREATINOQUINASE`]);
  exame("CKMB", [String.raw`\bCKMB\b`, String.raw`CK\s*-\s*MB`]);
  // "NT-proBNP" não tem fronteira de palavra antes do B, então \bBNP\b já
  // distingue os dois sem precisar de lookbehind.
  exame("NTPROBNP", [String.raw`NT-?\s?PRO-?\s?BNP`]);
  exame("BNP", [String.raw`\bBNP\b`]);
  exame("LAC", [String.raw`\bLACTATO\b`]);
  exame("TROP", [
    String.raw`TROPONINA\s+I[\s\S]{0,40}ALTA\s+SENSIBILIDADE`,
    String.raw`\bHS\s*TNI\b`,
    String.raw`\bTNI\b`,
  ]);

  // ===== GASOMETRIA =====
  const gasoArt = lerGasometria(tSangue, String.raw`GASOMETRIA\s+ARTERIAL`);
  if (gasoArt) partes.push(`GASART ${gasoArt}`);
  const gasoVen = lerGasometria(tSangue, String.raw`GASOMETRIA\s+VENOSA`);
  if (gasoVen) partes.push(`GASVEN ${gasoVen}`);

  // ===== URINA I — pH sempre, o resto só se alterado =====
  const ur1: string[] = [];

  const ph = valorDoRotulo(tUr, String.raw`\bPH\b`);
  if (ph) ur1.push(`PH ${ph.texto}`);

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

  const leuUr = valorDoRotulo(tUr, String.raw`\bLEUC[ÓO]CITOS\b`);
  if (leuUr) ur1.push(`LEUC ${leuUr.texto}`);

  // Hemácias: só quando passa da referência do laudo (até 20.000/mL).
  const hemUr = valorDoRotulo(tUr, String.raw`\bHEM[ÁA]CIAS\b`);
  if (hemUr && hemUr.numero > 20000) ur1.push(`HEM ${hemUr.texto}`);

  // Bactérias: só a partir de 1,0.
  const bactUr = valorDoRotulo(tUr, String.raw`\bBACT[ÉE]RIAS\b`);
  if (bactUr && bactUr.numero >= 1.0) ur1.push(`BACT ${bactUr.texto}`);

  const lev = extrairQualitativo(tUr, [String.raw`\bLEVEDURAS\b`]);
  if (qualitativoAlterado(lev)) ur1.push(`LEVED ${lev}`);

  if (ur1.length) partes.push(`UR1 ${ur1.join(" ")}`);

  if (!partes.length) return "";
  // Separador "|" e não "/": as datas e as unidades do laudo já têm barra, e
  // "UR 65,0 / CR 1,20" ficava ambíguo na leitura corrida do prontuário.
  return `LABS ${data}: ${partes.join(" | ")}`;
}
