import { NextResponse } from "next/server";
import { criarCookie, iguais } from "@/lib/sessao";

export async function POST(req: Request) {
  const senhaReal = process.env.PS_SENHA;
  if (!senhaReal) {
    return NextResponse.json({ erro: "sem_senha_configurada" }, { status: 503 });
  }

  let enviada = "";
  try {
    enviada = String(((await req.json()) as { senha?: unknown })?.senha ?? "");
  } catch {
    return NextResponse.json({ erro: "requisicao_invalida" }, { status: 400 });
  }

  if (!iguais(enviada, senhaReal)) {
    // Atraso fixo: não acelera o ataque nem revela nada pelo tempo de resposta.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ erro: "senha_incorreta" }, { status: 401 });
  }

  const cookie = await criarCookie(senhaReal);
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
