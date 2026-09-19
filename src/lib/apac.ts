/**
 * Gerador de APAC — porte do APAC.py (Flet + reportlab + pypdf) para o
 * navegador.
 *
 * O formulário da APAC é o laudo oficial do SUS e não tem campos de
 * formulário no PDF: o programa original desenhava o texto por cima, em
 * coordenadas medidas uma a uma sobre aquele arquivo. As coordenadas aqui são
 * as mesmas, ponto a ponto, e o PDF de saída é o mesmo modelo com uma camada
 * de texto sobreposta — nenhuma página é recriada.
 *
 * O que muda em relação ao .exe: não há pasta de saída nem impressora do
 * Windows no meio. O PDF nasce no navegador, você vê antes de imprimir, e
 * nada do que você digita sai daqui — nem para a Vercel, nem para o Supabase.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** Azul do formulário preenchido à máquina, igual ao do programa original. */
const COR = rgb(0x15 / 255, 0x96 / 255, 0xc5 / 255);
const TAMANHO = 9.5;
const MINIMO = 6.0;

/**
 * Métricas do Helvetica no AFM da Adobe, as mesmas que o reportlab usa em
 * getAscentDescent. Estão aqui em vez de virem do pdf-lib para que a linha de
 * base caia no mesmo lugar que caía no programa em Python.
 */
const ASCENDENTE = 0.718;
const DESCENDENTE = -0.207;

/** Mede um texto num tamanho de fonte. O pdf-lib entra por aqui. */
export type Medida = (texto: string, tamanho: number) => number;

export interface DadosApac {
  paciente: string;
  nascimento: string;
  exame: string;
  quantidade: string;
  exameSec1: string;
  quantidadeSec1: string;
  exameSec2: string;
  quantidadeSec2: string;
  diagnostico: string;
  cid: string;
  cidSecundario: string;
  justificativa: string;
  medico: string;
  solicitacao: string;
}

// ------------------------------------------------------------- texto

/** Maiúsculas, sem espaço dobrado nem sobrando nas pontas. */
export function emMaiusculas(valor: string): string {
  return valor.trim().toUpperCase().split(/\s+/).filter(Boolean).join(" ");
}

/** O mesmo, linha a linha: a justificativa é o único campo com parágrafos. */
export function emMaiusculasMultilinha(valor: string): string {
  const linhas = valor
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim().toUpperCase().split(/\s+/).filter(Boolean).join(" "));

  while (linhas.length && !linhas[0]) linhas.shift();
  while (linhas.length && !linhas[linhas.length - 1]) linhas.pop();

  return linhas.join("\n");
}

/**
 * O Helvetica embutido no PDF escreve em WinAnsi, que cobre o português
 * inteiro. O que cair fora — um traço tipográfico colado de outro sistema,
 * por exemplo — perderia o acento ou faria o pdf-lib recusar a página, então
 * é convertido antes: primeiro tentando a letra sem acento, depois somem.
 */
const WIN_ANSI =
  /[\x20-\x7e\xa0-\xff€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/;

export function emWinAnsi(texto: string): string {
  let saida = "";
  for (const ch of texto.normalize("NFC")) {
    if (WIN_ANSI.test(ch)) {
      saida += ch;
      continue;
    }
    const sem = ch.normalize("NFD").replace(/\p{M}/gu, "");
    for (const c of sem) if (WIN_ANSI.test(c)) saida += c;
  }
  return saida;
}

// ------------------------------------------------------------- medidas

/** Encolhe a fonte de 0,25 em 0,25 até o texto caber — ou até o piso. */
export function ajustarTamanho(
  medir: Medida,
  texto: string,
  larguraMax: number,
  inicial = TAMANHO,
  minimo = MINIMO,
): number {
  let tamanho = inicial;
  while (tamanho > minimo && medir(texto, tamanho) > larguraMax) tamanho -= 0.25;
  return tamanho;
}

/** Linha de base que deixa o texto no meio vertical da caixa. */
export function linhaDeBase(baixo: number, cima: number, tamanho = TAMANHO): number {
  const centro = (baixo + cima) / 2;
  return centro - ((ASCENDENTE + DESCENDENTE) * tamanho) / 2;
}

/** Quebra pela largura respeitando também as quebras que você digitou. */
export function quebrarTexto(
  medir: Medida,
  texto: string,
  larguraMax: number,
  tamanho: number,
): string[] {
  const saida: string[] = [];

  for (const paragrafo of texto.split(/\r?\n/)) {
    const palavras = paragrafo.split(/\s+/).filter(Boolean);
    if (!palavras.length) {
      saida.push("");
      continue;
    }

    let atual = palavras[0];
    for (const palavra of palavras.slice(1)) {
      const tentativa = `${atual} ${palavra}`;
      if (medir(tentativa, tamanho) <= larguraMax) atual = tentativa;
      else {
        saida.push(atual);
        atual = palavra;
      }
    }
    saida.push(atual);
  }

  return saida;
}

/** Quantas linhas a justificativa ocupa e em que corpo — o laudo cabe 6. */
export const LINHAS_JUSTIFICATIVA = 6;

export function medirJustificativa(
  medir: Medida,
  texto: string,
): { tamanho: number; linhas: string[]; sobra: string[] } {
  let tamanho = 9.0;
  let linhas = quebrarTexto(medir, texto, 480.0, tamanho);
  if (linhas.length > 5) {
    tamanho = 7.5;
    linhas = quebrarTexto(medir, texto, 480.0, tamanho);
  }
  return {
    tamanho,
    linhas: linhas.slice(0, LINHAS_JUSTIFICATIVA),
    // O programa original cortava em silêncio. Aqui o que não coube volta
    // para a tela avisar, porque é texto que some de um laudo assinado.
    sobra: linhas.slice(LINHAS_JUSTIFICATIVA),
  };
}

// ------------------------------------------------------------- datas

const DATA = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/** Devolve DD/MM/AAAA, ou null se a data não existe no calendário. */
export function validarData(valor: string): string | null {
  const m = DATA.exec(valor.trim());
  if (!m) return null;

  const [, d, mes, ano] = m;
  const dia = Number(d);
  const mm = Number(mes);
  const aaaa = Number(ano);

  const data = new Date(aaaa, mm - 1, dia);
  // 31/02 vira 03/03 no Date; comparar de volta é o que pega isso.
  if (data.getFullYear() !== aaaa || data.getMonth() !== mm - 1 || data.getDate() !== dia) {
    return null;
  }

  return `${String(dia).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${ano}`;
}

export function hoje(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** 1 a 99, como no formulário. Vazio só passa quando o campo é opcional. */
export function quantidadeValida(valor: string): boolean {
  return /^\d{1,2}$/.test(valor) && Number(valor) >= 1 && Number(valor) <= 99;
}

export function nomeDoArquivo(paciente: string, solicitacao: string): string {
  const limpo =
    paciente
      .replace(/[<>:"/\\|?*]/g, "")
      .trim()
      .replace(/\s+/g, " ") || "PACIENTE";
  return `APAC - ${limpo} - ${solicitacao.replace(/\//g, "-")}.pdf`;
}

// ------------------------------------------------------------- geração

/**
 * Régua do texto — e a parte menos óbvia do porte.
 *
 * Medir a frase inteira com o pdf-lib dá um número menor do que o que ele
 * mesmo desenha: a medição aplica os pares de kerning do Helvetica, a escrita
 * não. Numa justificativa isso passava de 480pt como se coubesse e a linha
 * saía por cima da borda da caixa. Medindo caractere a caractere não existe
 * par de kerning, e a conta volta a ser a do reportlab: soma das larguras em
 * unidades de fonte, escalada uma vez só no fim.
 */
function medidorDe(fonte: { widthOfTextAtSize(t: string, s: number): number }): Medida {
  const cache = new Map<string, number>();

  const unidades = (ch: string) => {
    let u = cache.get(ch);
    if (u === undefined) {
      u = fonte.widthOfTextAtSize(ch, 1000);
      cache.set(ch, u);
    }
    return u;
  };

  return (texto, tamanho) => {
    let total = 0;
    for (const ch of emWinAnsi(texto)) total += unidades(ch);
    return (total * tamanho) / 1000;
  };
}

export interface Laudo {
  pdf: Uint8Array;
  /** Linhas da justificativa que não couberam no formulário e não foram impressas. */
  sobra: string[];
}

/**
 * Desenha os dados sobre o modelo. As coordenadas são as do APAC.py e valem
 * para aquele APAC.pdf; trocar o modelo exige medir tudo de novo.
 */
export async function gerarApac(dados: DadosApac, modelo: ArrayBuffer): Promise<Laudo> {
  const pdf = await PDFDocument.load(modelo);
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const pagina = pdf.getPage(0);

  const medir = medidorDe(fonte);

  const escrever = (texto: string, x: number, y: number, tamanho: number) =>
    pagina.drawText(emWinAnsi(texto), { x, y, size: tamanho, font: fonte, color: COR });

  /** Escreve encolhendo a fonte se o texto não couber na largura. */
  const encaixar = (texto: string, x: number, y: number, larguraMax: number, inicial = TAMANHO) =>
    escrever(texto, x, y, ajustarTamanho(medir, texto, larguraMax, inicial));

  /** Centraliza nos dois eixos de uma caixa do formulário. */
  const centralizar = (
    texto: string,
    esquerda: number,
    baixo: number,
    direita: number,
    cima: number,
    tamanho = TAMANHO,
  ) => {
    const largura = medir(texto, tamanho);
    escrever(texto, (esquerda + direita) / 2 - largura / 2, linhaDeBase(baixo, cima, tamanho), tamanho);
  };

  encaixar(dados.paciente, 45.9, 699.8, 430.0);

  const [nDia, nMes, nAno] = dados.nascimento.split("/");
  centralizar(nDia, 301.38, 669.6, 328.38, 687.6);
  centralizar(nMes, 332.88, 669.6, 351.42, 687.6);
  centralizar(nAno, 355.92, 669.6, 389.1, 687.6);

  const yPrincipal = linhaDeBase(532.74, 553.2);
  encaixar(dados.exame, 311.5, yPrincipal, 190.0);
  centralizar(dados.quantidade, 512.88, 532.74, 562.38, 553.2);

  if (dados.exameSec1) {
    encaixar(dados.exameSec1, 223.0, linhaDeBase(488.26, 508.72, 9.0), 278.0, 9.0);
    centralizar(dados.quantidadeSec1, 512.88, 488.26, 562.38, 508.72);
  }

  if (dados.exameSec2) {
    encaixar(dados.exameSec2, 223.0, linhaDeBase(461.86, 482.32, 9.0), 278.0, 9.0);
    centralizar(dados.quantidadeSec2, 512.88, 461.86, 562.38, 482.32);
  }

  encaixar(dados.diagnostico, 55.4, 344.0, 275.0);
  encaixar(dados.cid, 349.0, 344.0, 45.0);
  if (dados.cidSecundario) encaixar(dados.cidSecundario, 412.0, 344.0, 45.0);

  const just = medirJustificativa(medir, dados.justificativa);
  const alturaLinha = just.tamanho + 3.0;
  just.linhas.forEach((linha, i) => escrever(linha, 55.4, 306.0 - i * alturaLinha, just.tamanho));

  encaixar(dados.medico, 56.0, 214.5, 245.0);

  const [sDia, sMes, sAno] = dados.solicitacao.split("/");
  centralizar(sDia, 305.88, 207.84, 326.7, 225.9);
  centralizar(sMes, 331.2, 207.84, 349.74, 225.9);
  centralizar(sAno, 354.24, 207.84, 385.74, 225.9);

  return { pdf: await pdf.save(), sobra: just.sobra };
}
