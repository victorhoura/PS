/**
 * Gerador de SADT — requisição de serviços de diagnóstico e terapia do
 * Hospital Municipal de Urgências.
 *
 * O formulário é o mesmo problema da APAC: PDF chapado, sem campo nenhum. Só
 * que aqui não havia programa em Python de onde tirar as coordenadas. Elas
 * foram medidas do próprio PDF: o texto dos rótulos foi extraído com posição
 * e corpo, e cada valor é escrito na linha de base do rótulo da sua linha,
 * começando onde o rótulo termina. Por isso o texto assenta em cima do
 * tracejado em vez de flutuar.
 *
 * O PDF de saída é o modelo com uma camada de texto por cima — a página
 * original não é recriada, e nada do que é digitado sai do navegador.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ajustarTamanho, emWinAnsi, medidorDe, type Medida } from "./pdf";

/** O azul que ele já usa para preencher este formulário à mão. */
const COR = rgb(0, 0.470588, 0.831373);

/** Mesmo corpo dos rótulos impressos: o preenchimento não destoa. */
const TAMANHO = 10;

/**
 * Respiro entre o fim do rótulo impresso e o começo do valor. Sem ele sai
 * "Nome:CAIO JORGE", colado, porque o x medido é exatamente onde o rótulo
 * acaba.
 */
const RECUO = 4;

/**
 * As casas da data de nascimento têm a largura exata de quatro sublinhados,
 * e "2001" a 10pt ocupa exatamente isso — encostaria nas duas barras. Um
 * corpo menor só para os três números resolve sem mexer no resto.
 */
const TAMANHO_DATA = 9;

export interface DadosSadt {
  requisitante: string;
  cartaoSus: string;
  paciente: string;
  nascimento: string;
  mae: string;
  endereco: string;
  municipio: string;
  hd: string;
  cid: string;
  historia: string;
  data: string;
  /** Até cinco, uma por linha da tabela; a primeira é obrigatória. */
  procedimentos: string[];
}

/**
 * Coordenadas medidas sobre o SADT.pdf: x já depois do rótulo, y na linha de
 * base da linha, largura até onde o tracejado (ou o próximo rótulo) termina.
 *
 * Os rótulos do formulário são NEGRITO (Liberation Sans Bold, compatível em
 * métrica com o Helvetica-Bold). Medi-los com o Helvetica normal joga o x
 * para a esquerda, e em "Município de residência:" isso dá 9pt de diferença —
 * o valor sai grudado no rótulo.
 */
const CAMPOS: Record<string, { x: number; y: number; largura: number }> = {
  requisitante: { x: 63.2, y: 617.2, largura: 197.5 },
  cartaoSus: { x: 336.0, y: 564.2, largura: 210.0 },
  paciente: { x: 63.2, y: 531.4, largura: 281.8 },
  mae: { x: 100.4, y: 492.5, largura: 244.6 },
  endereco: { x: 78.2, y: 473.1, largura: 493.8 },
  municipio: { x: 146.0, y: 453.7, largura: 119.7 },
  hd: { x: 45.4, y: 417.0, largura: 298.8 },
  cid: { x: 370.5, y: 417.0, largura: 181.5 },
  data: { x: 450.7, y: 378.5, largura: 91.3 },
};

/**
 * As três casas de "Data de Nasc: ____/____/____".
 *
 * A do ano vai 2pt para a direita de propósito: quatro dígitos ocupam quase
 * exatamente os quatro sublinhados, e centralizado o "2001" encosta na barra
 * anterior. Ali do lado só há espaço em branco até "Idade:", então o empurrão
 * não atrapalha nada e o ano deixa de parecer colado.
 */
const NASCIMENTO = {
  y: 512.0,
  casas: [
    { esquerda: 98.2, direita: 120.5 },
    { esquerda: 123.2, direita: 145.5 },
    { esquerda: 150.3, direita: 172.5 },
  ],
} as const;

/**
 * História clínica: a primeira linha começa depois do rótulo e para antes do
 * "Data:"; a segunda usa a folga até o cabeçalho da tabela e aproveita a
 * largura inteira.
 */
const HISTORIA = {
  linhas: [
    { x: 119.6, y: 378.5, largura: 300.3 },
    { x: 28.5, y: 366.5, largura: 546.0 },
  ],
} as const;

/** As cinco linhas da coluna "Descrição do Procedimento". */
const PROCEDIMENTOS = {
  x: 32.0,
  largura: 120.0,
  linhas: [333.9, 315.2, 296.5, 277.8, 259.2],
} as const;

export const LINHAS_HISTORIA = HISTORIA.linhas.length;
export const LINHAS_PROCEDIMENTO = PROCEDIMENTOS.linhas.length;

/**
 * Quebra um texto usando uma largura diferente por linha — a história clínica
 * tem a primeira linha curta (o rótulo ocupa o começo) e a segunda inteira.
 */
export function quebrarEmLarguras(
  medir: Medida,
  texto: string,
  larguras: readonly number[],
  tamanho: number,
): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const saida: string[] = [];
  let atual = "";

  const larguraDa = (i: number) => larguras[Math.min(i, larguras.length - 1)];

  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (!atual || medir(tentativa, tamanho) <= larguraDa(saida.length)) {
      atual = tentativa;
    } else {
      saida.push(atual);
      atual = palavra;
    }
  }
  if (atual) saida.push(atual);
  return saida;
}

/**
 * Acha o corpo em que a história cabe nas duas linhas, encolhendo de 10 até
 * 8. O que ainda sobrar volta para a tela: é texto que sumiria do pedido.
 */
export function medirHistoria(
  medir: Medida,
  texto: string,
): { tamanho: number; linhas: string[]; sobra: string[] } {
  const larguras = HISTORIA.linhas.map((l, i) => l.largura - (i === 0 ? RECUO : 0));
  let tamanho = TAMANHO;
  let linhas = quebrarEmLarguras(medir, texto, larguras, tamanho);

  for (const menor of [9, 8]) {
    if (linhas.length <= LINHAS_HISTORIA) break;
    tamanho = menor;
    linhas = quebrarEmLarguras(medir, texto, larguras, tamanho);
  }

  return {
    tamanho,
    linhas: linhas.slice(0, LINHAS_HISTORIA),
    sobra: linhas.slice(LINHAS_HISTORIA),
  };
}

export interface Requisicao {
  pdf: Uint8Array;
  /** Pedaços da história clínica que não couberam e não foram impressos. */
  sobra: string[];
}

export async function gerarSadt(dados: DadosSadt, modelo: ArrayBuffer): Promise<Requisicao> {
  const pdf = await PDFDocument.load(modelo);
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const pagina = pdf.getPage(0);
  const medir = medidorDe(fonte);

  const escrever = (texto: string, x: number, y: number, tamanho = TAMANHO) => {
    if (texto) pagina.drawText(emWinAnsi(texto), { x, y, size: tamanho, font: fonte, color: COR });
  };

  /** Escreve depois do rótulo, encolhendo a fonte se não couber na linha. */
  const encaixar = (texto: string, campo: { x: number; y: number; largura: number }) => {
    const largura = campo.largura - RECUO;
    escrever(texto, campo.x + RECUO, campo.y, ajustarTamanho(medir, texto, largura, TAMANHO));
  };

  /** Centraliza numa das casas da data de nascimento. */
  const centralizar = (texto: string, casa: { esquerda: number; direita: number }, y: number) => {
    const tamanho = ajustarTamanho(medir, texto, casa.direita - casa.esquerda, TAMANHO_DATA);
    const x = (casa.esquerda + casa.direita) / 2 - medir(texto, tamanho) / 2;
    escrever(texto, x, y, tamanho);
  };

  encaixar(dados.requisitante, CAMPOS.requisitante);
  encaixar(dados.cartaoSus, CAMPOS.cartaoSus);
  encaixar(dados.paciente, CAMPOS.paciente);
  encaixar(dados.mae, CAMPOS.mae);
  encaixar(dados.endereco, CAMPOS.endereco);
  encaixar(dados.municipio, CAMPOS.municipio);
  encaixar(dados.hd, CAMPOS.hd);
  encaixar(dados.cid, CAMPOS.cid);
  encaixar(dados.data, CAMPOS.data);

  dados.nascimento
    .split("/")
    .forEach((parte, i) => centralizar(parte, NASCIMENTO.casas[i], NASCIMENTO.y));

  const historia = medirHistoria(medir, dados.historia);
  historia.linhas.forEach((linha, i) =>
    // Só a primeira linha vem depois do rótulo; a segunda começa na margem.
    escrever(linha, HISTORIA.linhas[i].x + (i === 0 ? RECUO : 0), HISTORIA.linhas[i].y, historia.tamanho),
  );

  // A coluna de procedimentos não tem rótulo à esquerda, então aqui não entra
  // o recuo: o texto começa em cima do começo da própria linha tracejada.
  dados.procedimentos.slice(0, LINHAS_PROCEDIMENTO).forEach((proc, i) => {
    const tamanho = ajustarTamanho(medir, proc, PROCEDIMENTOS.largura, TAMANHO);
    escrever(proc, PROCEDIMENTOS.x, PROCEDIMENTOS.linhas[i], tamanho);
  });

  return { pdf: await pdf.save(), sobra: historia.sobra };
}
