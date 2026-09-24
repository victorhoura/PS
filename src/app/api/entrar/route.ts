import { NextResponse } from "next/server";
import { criarCookie } from "@/lib/sessao";
import { conferirEntrada, segredoDeAssinatura } from "@/lib/acesso";

/**
 * A porta do app — e do desbloqueio, que é a mesma tela.
 *
 * A senha conferida aqui é a do banco, se houver uma; senão, a `PS_SENHA` da
 * Vercel, como sempre foi. Com o autenticador configurado, vale também o
 * código de seis dígitos. Quem decide é `lib/acesso`.
 */
export async function POST(req: Request) {
  const segredo = await segredoDeAssinatura();
  if (!segredo) {
    return NextResponse.json({ erro: "sem_senha_configurada" }, { status: 503 });
  }

  let senha = "";
  let codigo = "";
  try {
    const corpo = (await req.json()) as { senha?: unknown; codigo?: unknown };
    senha = String(corpo?.senha ?? "");
    codigo = String(corpo?.codigo ?? "");
  } catch {
    return NextResponse.json({ erro: "requisicao_invalida" }, { status: 400 });
  }

  if (!(await conferirEntrada(senha, codigo))) {
    // Atraso fixo: não acelera o ataque nem revela nada pelo tempo de resposta.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ erro: "entrada_recusada" }, { status: 401 });
  }

  const cookie = await criarCookie(segredo);
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
