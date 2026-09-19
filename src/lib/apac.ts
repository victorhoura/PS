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
 *
 * As peças comuns com a SADT (medir, encolher, quebrar, normalizar) moram em
 * pdf.ts.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  ajustarTamanho,
  emWinAnsi,
  linhaDeBase,
  medidorDe,
  quebrarTexto,
  type Medida,
} from "./pdf";

/** Azul do formulário preenchido à máquina, igual ao do programa original. */
const COR = rgb(0x15 / 255, 0x96 / 255, 0xc5 / 255);
const TAMANHO = 9.5;

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

/** Quantas das seis linhas o campo de justificativa do laudo comporta. */
export const LINHAS_JUSTIFICATIVA = 6;

/** Quantas linhas a justificativa ocupa e em que corpo — o laudo cabe 6. */
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

/** 1 a 99, como no formulário. Vazio só passa quando o campo é opcional. */
export function quantidadeValida(valor: string): boolean {
  return /^\d{1,2}$/.test(valor) && Number(valor) >= 1 && Number(valor) <= 99;
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

  const yPrincipal = linhaDeBase(532.74, 553.2, TAMANHO);
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
