import { NextResponse, type NextRequest } from "next/server";
import { NOME_COOKIE, cookieValido } from "@/lib/sessao";

/**
 * Tranca tudo menos a tela de entrada e o que o PWA precisa buscar antes de
 * ter sessão (manifest, service worker, ícones) — senão o app não instala.
 */
const LIVRES = ["/entrar", "/api/entrar", "/manifest.webmanifest", "/sw.js", "/icon.svg"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (LIVRES.includes(pathname) || pathname.startsWith("/icone")) {
    return NextResponse.next();
  }

  const senha = process.env.PS_SENHA;
  // Sem senha configurada o app fica aberto: é melhor do que travar o plantão
  // por uma variável de ambiente esquecida. A tela de entrada avisa disso.
  if (!senha) return NextResponse.next();

  if (await cookieValido(req.cookies.get(NOME_COOKIE)?.value, senha)) {
    return NextResponse.next();
  }

  const destino = req.nextUrl.clone();
  destino.pathname = "/entrar";
  destino.searchParams.set("de", pathname);
  return NextResponse.redirect(destino);
}

export const config = {
  // Deixa passar os assets com hash, que não têm o que proteger e são muitos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
