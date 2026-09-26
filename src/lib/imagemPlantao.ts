import { CAIXA_DA_MARCA, COR_FUNDO, COR_NAVY, COR_TEAL, FUNDO, NAVY, TEAL } from "./marca";
import { duracao, paraMinutos, type Divisao } from "./plantao";

/**
 * A divisão de plantão como imagem, para mandar no grupo do WhatsApp.
 *
 * Um cartão no desenho do app: título com a data da noite e a marca, quatro
 * números de relance (início, fim, total, cada um) e a lista de turnos
 * agrupada com divisórias — quem à esquerda, quando à direita, em destaque.
 *
 * Desenhado num <canvas> com a Inter do app. Sempre no tema claro: a imagem
 * é a mesma para quem manda e para quem recebe, e o fundo branco lê bem na
 * conversa clara ou escura. Tirar "foto" do HTML (SVG com foreignObject)
 * seria menos código, mas o Safari do iPhone perde a fonte e às vezes a
 * imagem inteira nesse caminho.
 */

/** Tema claro de globals.css. */
const COR = {
  fundo: "rgb(246, 247, 249)",
  painel: "rgb(255, 255, 255)",
  borda: "rgb(226, 230, 235)",
  tinta: "rgb(17, 20, 24)",
  apagada: "rgb(92, 101, 114)",
  acento: "rgb(11, 106, 133)",
  selo: "rgba(11, 106, 133, 0.12)",
  lista: "rgba(246, 247, 249, 0.45)",
  sombra: "rgba(71, 85, 105, 0.12)",
};

/** Medidas em pixels de tela; o arquivo sai em 3× para ficar nítido no celular. */
const ESCALA = 3;
const LARGURA = 440;
const MARGEM = 20;
const RECUO = 24;
const LINHA = 60;
const DIA = 24 * 60;
const SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

/** Corta com reticências o que não cabe em `largura`. */
export function cortar(texto: string, largura: number, medir: (t: string) => number): string {
  if (medir(texto) <= largura) return texto;
  let n = texto.length;
  while (n > 0 && medir(texto.slice(0, n).trimEnd() + "…") > largura) n--;
  return texto.slice(0, n).trimEnd() + "…";
}

/** O resumo do cabeçalho da tela: "23:52 às 07:00 · 7h08 · 2h23 cada". */
export function resumoDaDivisao(d: Divisao): string {
  return `${d.inicio} às ${d.fim} · ${duracao(d.total)} · ${duracaoDeCada(d)} cada`;
}

function duracaoDeCada(d: Divisao): string {
  return duracao(Math.round(d.total / d.turnos.length));
}

/**
 * A data do plantão, como se fala: "SEX 26/09 → SÁB 27/09" quando passa da
 * meia-noite, "SÁB 27/09" quando não. O dia do início é o que deixa a hora
 * de início mais perto de agora — dividir à 00:13 um plantão que começou às
 * 23:50 é o plantão de ontem, não o de hoje à noite.
 */
export function datasDoPlantao(d: Divisao, agora: Date): string {
  const inicio = paraMinutos(d.inicio) ?? 0;
  const diferenca = inicio - (agora.getHours() * 60 + agora.getMinutes());
  const desvio = diferenca > DIA / 2 ? -1 : diferenca < -DIA / 2 ? 1 : 0;
  const dia = (mais: number) => {
    const data = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + desvio + mais);
    const dd = String(data.getDate()).padStart(2, "0");
    const mm = String(data.getMonth() + 1).padStart(2, "0");
    return `${SEMANA[data.getDay()]} ${dd}/${mm}`;
  };
  return inicio + d.total > DIA ? `${dia(0)} → ${dia(1)}` : dia(0);
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

/** A marca do app, com os mesmos contornos do <Logo>. */
function marca(ctx: CanvasRenderingContext2D, x: number, y: number, lado: number) {
  const c = CAIXA_DA_MARCA;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(lado / c.lado, lado / c.lado);
  ctx.translate(-c.x, -c.y);
  ctx.translate(0, c.altura);
  ctx.scale(0.1, -0.1);
  for (const [cor, caminho] of [
    [COR_FUNDO, FUNDO],
    [COR_NAVY, NAVY],
    [COR_TEAL, TEAL],
  ]) {
    ctx.fillStyle = cor;
    ctx.fill(new Path2D(caminho));
  }
  ctx.restore();
}

/** Desenha a divisão e devolve o PNG pronto para compartilhar. */
export async function imagemDaDivisao(d: Divisao, agora = new Date()): Promise<File> {
  // A família resolvida da página ("__Inter_xxx, …"): a mesma letra do app.
  const familia = getComputedStyle(document.body).fontFamily;
  const fonte = (peso: number, tamanho: number) => `${peso} ${tamanho}px ${familia}`;
  await Promise.all([400, 500, 600, 700].map((p) => document.fonts.load(fonte(p, 12)).catch(() => [])));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");

  const espacar = (em: number, tamanho: number) => {
    // letterSpacing é recente (Safari 18); onde não existe, só fica sem.
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${em * tamanho}px`;
  };
  const medir = (t: string) => ctx.measureText(t).width;
  const escrever = (
    texto: string,
    x: number,
    y: number,
    peso: number,
    tamanho: number,
    cor: string,
    { alinhar = "left" as CanvasTextAlign, tracking = 0 } = {},
  ) => {
    ctx.font = fonte(peso, tamanho);
    espacar(tracking, tamanho);
    ctx.fillStyle = cor;
    ctx.textAlign = alinhar;
    ctx.fillText(texto, x, y);
    const largura = medir(texto);
    espacar(0, tamanho);
    return largura;
  };

  // Geometria
  const cartaoX = MARGEM;
  const cartaoL = LARGURA - 2 * MARGEM;
  const x0 = cartaoX + RECUO;
  const dentroL = cartaoL - 2 * RECUO;
  const cabecalhoA = 44;
  const blocoA = 56;
  const listaA = d.turnos.length * LINHA;
  const cartaoA = RECUO + cabecalhoA + 20 + blocoA + 20 + listaA + RECUO;
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
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  retangulo(ctx, cartaoX, MARGEM, cartaoL, cartaoA, 16);
  ctx.fillStyle = COR.painel;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = COR.borda;
  ctx.lineWidth = 1;
  retangulo(ctx, cartaoX + 0.5, MARGEM + 0.5, cartaoL - 1, cartaoA - 1, 16);
  ctx.stroke();

  // Cabeçalho: título e data à esquerda, a marca à direita
  let y = MARGEM + RECUO;
  const marcaL = 40;
  escrever("DIVISÃO DE PLANTÃO", x0, y + 12, 700, 19, COR.tinta, { tracking: 0.01 });
  escrever(datasDoPlantao(d, agora), x0, y + 36, 500, 12, COR.apagada, { tracking: 0.02 });
  marca(ctx, x0 + dentroL - marcaL, y + (cabecalhoA - marcaL) / 2, marcaL);
  y += cabecalhoA + 20;

  // Quatro números de relance
  const numeros: [string, string][] = [
    ["INÍCIO", d.inicio],
    ["FIM", d.fim],
    ["TOTAL", duracao(d.total)],
    ["CADA", duracaoDeCada(d)],
  ];
  const vao = 8;
  const blocoL = (dentroL - vao * (numeros.length - 1)) / numeros.length;
  numeros.forEach(([rotulo, valor], i) => {
    const bx = x0 + i * (blocoL + vao);
    retangulo(ctx, bx, y, blocoL, blocoA, 10);
    ctx.fillStyle = COR.fundo;
    ctx.fill();
    escrever(rotulo, bx + 12, y + 17, 600, 9.5, COR.apagada, { tracking: 0.08 });
    escrever(valor, bx + 12, y + 37, 700, 17, COR.tinta);
  });
  y += blocoA + 20;

  // Turnos: quem à esquerda, quando à direita
  retangulo(ctx, x0 + 0.5, y + 0.5, dentroL - 1, listaA - 1, 12);
  ctx.fillStyle = COR.lista;
  ctx.fill();
  ctx.strokeStyle = COR.borda;
  ctx.stroke();

  /*
   * Hora em algarismos de largura fixa, como o .tabular da tela: o canvas
   * não tem font-variant-numeric, então cada dígito vai numa casa do
   * tamanho do mais largo. Assim o "às" de uma linha cai embaixo do da
   * outra, e todos os nomes têm o mesmo espaço.
   */
  const hora = (texto: string, direita: number, cy: number, desenhar = true) => {
    ctx.font = fonte(700, 15);
    const casa = Math.max(...[..."0123456789"].map(medir));
    const larguras = [...texto].map((c) => (/\d/.test(c) ? casa : medir(c)));
    const total = larguras.reduce((a, b) => a + b, 0);
    if (desenhar) {
      let x = direita - total;
      ctx.fillStyle = COR.tinta;
      ctx.textAlign = "center";
      [...texto].forEach((c, i) => {
        ctx.fillText(c, x + larguras[i] / 2, cy);
        x += larguras[i];
      });
    }
    return total;
  };
  const horario = (t: Divisao["turnos"][number], direita: number, cy: number) => {
    let x = direita;
    x -= hora(t.fim, x, cy);
    x -= escrever(" às ", x, cy, 400, 12, COR.apagada, { alinhar: "right" });
    hora(t.inicio, x, cy);
  };
  ctx.font = fonte(400, 12);
  const horarioL = 2 * hora("00:00", 0, 0, false) + medir(" às ");

  const recuoLinha = 16;
  const seloR = 14;
  const textoX = x0 + recuoLinha + seloR * 2 + 12;
  const direita = x0 + dentroL - recuoLinha;
  const nomeL = direita - horarioL - 16 - textoX;

  d.turnos.forEach((t, i) => {
    const topo = y + i * LINHA;
    const cy = topo + LINHA / 2;
    if (i > 0) {
      ctx.fillStyle = COR.borda;
      ctx.fillRect(x0 + 1, topo, dentroL - 2, 1);
    }

    // Selo com a ordem
    ctx.beginPath();
    ctx.arc(x0 + recuoLinha + seloR, cy, seloR, 0, Math.PI * 2);
    ctx.fillStyle = COR.selo;
    ctx.fill();
    escrever(String(t.ordem), x0 + recuoLinha + seloR, cy + 0.5, 700, 12, COR.acento, { alinhar: "center" });

    // Nome e, embaixo, quanto tempo
    ctx.font = fonte(600, 13.5);
    escrever(cortar(t.nome, nomeL, medir), textoX, cy - 9, 600, 13.5, COR.tinta);
    escrever(duracao(t.minutos), textoX, cy + 10, 500, 11.5, COR.apagada);

    horario(t, direita, cy);
  });

  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
  if (!blob) throw new Error("imagem não gerada");
  return new File([blob], "divisao-de-plantao.png", { type: "image/png" });
}
