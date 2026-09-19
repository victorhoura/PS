/**
 * Peças comuns de quem preenche formulário em PDF.
 *
 * Os laudos da APAC e da SADT são o mesmo problema: um PDF chapado, sem campo
 * nenhum, em que o texto precisa ser desenhado por cima em coordenada medida
 * a mão. O que muda de um para o outro são as coordenadas; o resto — medir,
 * encolher, quebrar linha, normalizar o que foi digitado — é isto aqui.
 */

/** Mede um texto num tamanho de fonte. O pdf-lib entra por aqui. */
export type Medida = (texto: string, tamanho: number) => number;

/**
 * Métricas do Helvetica no AFM da Adobe, as mesmas que o reportlab usa em
 * getAscentDescent. Estão aqui em vez de virem do pdf-lib para que a linha de
 * base caia no mesmo lugar que caía nos programas em Python.
 */
const ASCENDENTE = 0.718;
const DESCENDENTE = -0.207;

// ------------------------------------------------------------- texto

/** Maiúsculas, sem espaço dobrado nem sobrando nas pontas. */
export function emMaiusculas(valor: string): string {
  return valor.trim().toUpperCase().split(/\s+/).filter(Boolean).join(" ");
}

/** O mesmo, linha a linha, para os campos que aceitam parágrafo. */
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

/**
 * Régua do texto — e a parte menos óbvia deste porte.
 *
 * Medir a frase inteira com o pdf-lib dá um número menor do que o que ele
 * mesmo desenha: a medição aplica os pares de kerning do Helvetica, a escrita
 * não. Numa justificativa isso passava de 480pt como se coubesse e a linha
 * saía por cima da borda da caixa. Medindo caractere a caractere não existe
 * par de kerning, e a conta volta a ser a do reportlab: soma das larguras em
 * unidades de fonte, escalada uma vez só no fim.
 */
export function medidorDe(fonte: { widthOfTextAtSize(t: string, s: number): number }): Medida {
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

/** Encolhe a fonte de 0,25 em 0,25 até o texto caber — ou até o piso. */
export function ajustarTamanho(
  medir: Medida,
  texto: string,
  larguraMax: number,
  inicial: number,
  minimo = 6.0,
): number {
  let tamanho = inicial;
  while (tamanho > minimo && medir(texto, tamanho) > larguraMax) tamanho -= 0.25;
  return tamanho;
}

/** Linha de base que deixa o texto no meio vertical da caixa. */
export function linhaDeBase(baixo: number, cima: number, tamanho: number): number {
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

// ------------------------------------------------------------- arquivo

/** "APAC - MARIA - 19-09-2026.pdf": o que o navegador vai baixar. */
export function nomeDeArquivo(prefixo: string, paciente: string, data: string): string {
  const limpo =
    paciente
      .replace(/[<>:"/\\|?*]/g, "")
      .trim()
      .replace(/\s+/g, " ") || "PACIENTE";
  return `${prefixo} - ${limpo} - ${data.replace(/\//g, "-")}.pdf`;
}
