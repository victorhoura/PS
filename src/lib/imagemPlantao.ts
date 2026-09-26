import { duracao, type Divisao } from "./plantao";

/**
 * A divisão de plantão como imagem, para mandar no grupo do WhatsApp.
 *
 * É o mesmo cartão de TURNOS da tela, desenhado num <canvas> com a Inter do
 * app. Sempre no tema claro: a imagem é a mesma para quem manda e para quem
 * recebe, e o fundo branco lê bem na conversa clara ou escura. Tirar "foto"
 * do HTML (SVG com foreignObject) seria menos código, mas o Safari do iPhone
 * perde a fonte e às vezes a imagem inteira nesse caminho.
 */

/** Tema claro de globals.css. */
const COR = {
  fundo: "rgb(246, 247, 249)",
  painel: "rgb(255, 255, 255)",
  borda: "rgb(226, 230, 235)",
  tinta: "rgb(17, 20, 24)",
  apagada: "rgb(92, 101, 114)",
  acento: "rgb(11, 106, 133)",
  selo: "rgba(11, 106, 133, 0.15)",
  lista: "rgba(246, 247, 249, 0.4)",
  sombra: "rgba(71, 85, 105, 0.06)",
};

/** Medidas em pixels de tela; o arquivo sai em 3× para ficar nítido no celular. */
const ESCALA = 3;
const LARGURA = 400;
const MARGEM = 16;
const RECUO = 16;
const LINHA = 58;

/** Corta com reticências o que não cabe em `largura`. */
export function cortar(texto: string, largura: number, medir: (t: string) => number): string {
  if (medir(texto) <= largura) return texto;
  let n = texto.length;
  while (n > 0 && medir(texto.slice(0, n).trimEnd() + "…") > largura) n--;
  return texto.slice(0, n).trimEnd() + "…";
}

/** O resumo do cabeçalho: "23:52 às 07:00 · 7h08 · 2h23 cada". */
export function resumoDaDivisao(d: Divisao): string {
  const cada = duracao(Math.round(d.total / d.turnos.length));
  return `${d.inicio} às ${d.fim} · ${duracao(d.total)} · ${cada} cada`;
}

function retangulo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Desenha a divisão e devolve o PNG pronto para compartilhar. */
export async function imagemDaDivisao(d: Divisao): Promise<File> {
  // A família resolvida da página ("__Inter_xxx, …"): a mesma letra do app.
  const familia = getComputedStyle(document.body).fontFamily;
  const fonte = (peso: number, tamanho: number) => `${peso} ${tamanho}px ${familia}`;
  await Promise.all([400, 500, 600].map((p) => document.fonts.load(fonte(p, 12)).catch(() => [])));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");

  const espacar = (px: number) => {
    // letterSpacing é recente (Safari 18); onde não existe, só fica sem.
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`;
  };
  const medir = (t: string) => ctx.measureText(t).width;

  // Cabeçalho numa linha só quando cabe; senão, o resumo desce.
  const cartaoX = MARGEM;
  const cartaoL = LARGURA - 2 * MARGEM;
  const dentroL = cartaoL - 2 * RECUO;
  const titulo = "DIVISÃO DE PLANTÃO";
  const resumo = resumoDaDivisao(d);
  ctx.font = fonte(600, 11);
  espacar(0.66);
  const tituloL = medir(titulo);
  espacar(0);
  ctx.font = fonte(400, 11);
  const resumoL = medir(resumo);
  const umaLinha = tituloL + 12 + resumoL <= dentroL;
  const cabecalhoA = umaLinha ? 16 : 34;

  const listaA = d.turnos.length * LINHA;
  const cartaoA = RECUO + cabecalhoA + 12 + listaA + RECUO;
  const altura = MARGEM + cartaoA + MARGEM;

  canvas.width = LARGURA * ESCALA;
  canvas.height = altura * ESCALA;
  ctx.scale(ESCALA, ESCALA);
  ctx.textBaseline = "middle";

  // Fundo e cartão
  ctx.fillStyle = COR.fundo;
  ctx.fillRect(0, 0, LARGURA, altura);
  ctx.save();
  ctx.shadowColor = COR.sombra;
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  retangulo(ctx, cartaoX, MARGEM, cartaoL, cartaoA, 12);
  ctx.fillStyle = COR.painel;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = COR.borda;
  ctx.lineWidth = 1;
  retangulo(ctx, cartaoX + 0.5, MARGEM + 0.5, cartaoL - 1, cartaoA - 1, 12);
  ctx.stroke();

  // Cabeçalho: DIVISÃO DE PLANTÃO · resumo
  const x0 = cartaoX + RECUO;
  let y = MARGEM + RECUO;
  ctx.font = fonte(600, 11);
  espacar(0.66);
  ctx.fillStyle = COR.acento;
  ctx.textAlign = "left";
  ctx.fillText(titulo, x0, y + 8);
  espacar(0);
  ctx.font = fonte(400, 11);
  ctx.fillStyle = COR.apagada;
  if (umaLinha) {
    ctx.textAlign = "right";
    ctx.fillText(resumo, x0 + dentroL, y + 8);
    ctx.textAlign = "left";
  } else {
    ctx.fillText(cortar(resumo, dentroL, medir), x0, y + 26);
  }
  y += cabecalhoA + 12;

  // Lista de turnos
  retangulo(ctx, x0 + 0.5, y + 0.5, dentroL - 1, listaA - 1, 8);
  ctx.fillStyle = COR.lista;
  ctx.fill();
  ctx.strokeStyle = COR.borda;
  ctx.stroke();

  d.turnos.forEach((t, i) => {
    const topo = y + i * LINHA;
    if (i > 0) {
      ctx.fillStyle = COR.borda;
      ctx.fillRect(x0 + 1, topo, dentroL - 2, 1);
    }

    // Selo com o número
    const seloX = x0 + 12 + 12;
    const seloY = topo + 11 + 12;
    ctx.beginPath();
    ctx.arc(seloX, seloY, 12, 0, Math.PI * 2);
    ctx.fillStyle = COR.selo;
    ctx.fill();
    ctx.font = fonte(600, 11);
    ctx.fillStyle = COR.acento;
    ctx.textAlign = "center";
    ctx.fillText(String(t.ordem), seloX, seloY + 0.5);
    ctx.textAlign = "left";

    // Nome, e embaixo "23:52 às 02:15 · 2h23"
    const tx = x0 + 12 + 24 + 12;
    const tL = x0 + dentroL - 12 - tx;
    ctx.font = fonte(600, 12);
    ctx.fillStyle = COR.tinta;
    ctx.fillText(cortar(t.nome, tL, medir), tx, topo + 11 + 8);

    const base = topo + 11 + 16 + 3 + 9;
    let cx = tx;
    const pedaco = (texto: string, peso: number, tamanho: number, cor: string) => {
      ctx.font = fonte(peso, tamanho);
      ctx.fillStyle = cor;
      ctx.fillText(texto, cx, base);
      cx += medir(texto);
    };
    pedaco(t.inicio, 600, 13, COR.tinta);
    pedaco(" às ", 400, 13, COR.apagada);
    pedaco(t.fim, 600, 13, COR.tinta);
    cx += 6;
    pedaco(`· ${duracao(t.minutos)}`, 500, 11, COR.apagada);
  });

  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
  if (!blob) throw new Error("imagem não gerada");
  return new File([blob], "divisao-de-plantao.png", { type: "image/png" });
}
