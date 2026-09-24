import { NextResponse } from "next/server";
import {
  derivar,
  gastarCodigo,
  gravarAcesso,
  lerAcesso,
  novoSal,
  segredoDeAssinatura,
} from "@/lib/acesso";
import { criarCookie } from "@/lib/sessao";
import { enderecoOtpauth, novoSegredoTotp } from "@/lib/totp";
import { nuvemConfigurada } from "@/lib/supabase";

/**
 * Trocar a senha do app.
 *
 * O proxy já garantiu que só chega aqui quem tem sessão — ou seja, quem já
 * provou a senha atual alguma hora nas últimas 12 horas. O que o segundo
 * fator protege é o resto do intervalo: um computador de plantão com a sua
 * sessão aberta, em que qualquer um poderia trocar a senha e tomar o app.
 * Por isso o código do autenticador, e por isso ele é obrigatório.
 *
 * GET  devolve o estado: se já existe autenticador configurado.
 * POST com { acao: "preparar" }  gera um segredo e devolve o QR para escanear.
 * POST com { nova, confirmacao, codigo } troca a senha de verdade.
 */

const MINIMO = 8;

function semNuvem() {
  return NextResponse.json(
    {
      erro: "nuvem_nao_configurada",
      mensagem: "A senha nova mora no banco, e ele não está configurado neste servidor.",
    },
    { status: 503 },
  );
}

export async function GET() {
  if (!nuvemConfigurada()) return semNuvem();
  const acesso = await lerAcesso().catch(() => null);
  return NextResponse.json({
    temAutenticador: Boolean(acesso?.totp),
    temSenhaPropria: Boolean(acesso),
  });
}

export async function POST(req: Request) {
  if (!nuvemConfigurada()) return semNuvem();

  let corpo: {
    acao?: string;
    nova?: unknown;
    confirmacao?: unknown;
    codigo?: unknown;
    segredo?: unknown;
  };
  try {
    corpo = (await req.json()) as typeof corpo;
  } catch {
    return NextResponse.json({ erro: "requisicao_invalida" }, { status: 400 });
  }

  const acesso = await lerAcesso().catch(() => null);

  // ---------------------------------------------------------- preparar o QR
  if (corpo.acao === "preparar") {
    // Trocar o autenticador de um que JÁ existe exigiria o código do antigo,
    // senão o segundo fator não protegeria nada: bastaria pedir um novo QR.
    if (acesso?.totp) {
      return NextResponse.json({ erro: "autenticador_ja_configurado" }, { status: 409 });
    }
    const segredo = novoSegredoTotp();
    const endereco = enderecoOtpauth(segredo);
    // O QR é desenhado aqui, e não no navegador, para a biblioteca não ir
    // junto no pacote que o app carrega — ela serve a uma tela só, usada uma
    // vez na vida.
    const { toString: paraSvg } = await import("qrcode");
    const svg = await paraSvg(endereco, {
      type: "svg",
      margin: 1,
      // Sem cor fixa: o `currentColor` deixa o QR seguir o tema da página.
      color: { dark: "#000000ff", light: "#ffffffff" },
    });
    // O segredo só é gravado quando a troca acontece, junto com a senha: um
    // QR gerado e abandonado não pode deixar meio-configurado para trás.
    return NextResponse.json({ segredo, endereco, svg });
  }

  // -------------------------------------------------------------- trocar
  const nova = String(corpo.nova ?? "");
  const confirmacao = String(corpo.confirmacao ?? "");
  const codigo = String(corpo.codigo ?? "");
  // Na primeira troca o segredo ainda não está no banco: ele vem da tela,
  // que acabou de mostrar o QR.
  const segredoTotp = acesso?.totp ?? String(corpo.segredo ?? "");

  if (nova.length < MINIMO) {
    return NextResponse.json(
      { erro: "curta", mensagem: `Use pelo menos ${MINIMO} caracteres.` },
      { status: 400 },
    );
  }
  if (nova !== confirmacao) {
    return NextResponse.json(
      { erro: "nao_confere", mensagem: "As duas senhas não conferem." },
      { status: 400 },
    );
  }
  if (!segredoTotp) {
    return NextResponse.json(
      { erro: "sem_autenticador", mensagem: "Configure o autenticador antes de trocar a senha." },
      { status: 400 },
    );
  }
  // O mesmo código que acabou de abrir o app não serve de novo aqui: cada
  // código entra uma vez só, na entrada ou na troca.
  const passo = await gastarCodigo(segredoTotp, codigo, acesso?.totp ? acesso.ultimoPasso : 0);
  if (passo === null) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json(
      {
        erro: "codigo_invalido",
        mensagem: "Código do autenticador incorreto, vencido ou já usado. Espere o próximo.",
      },
      { status: 401 },
    );
  }

  const sal = novoSal();
  await gravarAcesso({
    versao: (acesso?.versao ?? 0) + 1,
    hash: await derivar(nova, sal),
    sal,
    totp: segredoTotp,
    ultimoPasso: passo,
  });

  /*
   * A sessão atual também cai — a chave de assinatura acabou de mudar. Como
   * quem está aqui é você, e seria grosseiro jogar para a tela de senha sem
   * mais, sai daqui um cookie novo já assinado com a chave nova. Em qualquer
   * OUTRO computador, a sessão morre assim que o cache do proxy virar.
   */
  const cookie = await criarCookie((await segredoDeAssinatura())!);
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(cookie.nome, cookie.valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookie.maxAge,
  });
  return resposta;
}
