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
    const resposta = NextResponse.next();
    // Sem isto o bloqueio nao vale: o navegador guarda o HTML e, ao voltar,
    // reexibe a pagina do proprio cache sem consultar o servidor — e este
    // proxy nunca roda. `no-store` tambem desliga o bfcache da pagina.
    // O funcionamento offline nao depende deste cache e sim do service
    // worker, que tem armazenamento proprio.
    resposta.headers.set("Cache-Control", "no-store, must-revalidate");
    return resposta;
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
