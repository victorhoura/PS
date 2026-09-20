import { NextResponse } from "next/server";
import { NOME_COOKIE } from "@/lib/sessao";

/**
 * Bloqueia o app: apaga o cookie de sessão. O proxy passa a mandar toda
 * navegação para /entrar no próximo pedido.
 *
 * Existe para o computador compartilhado do plantão — você levanta da mesa e
 * bloqueia, em vez de deixar a sessão aberta as 12 horas restantes para quem
 * sentar depois.
 */
export async function POST() {
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(NOME_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return resposta;
}
