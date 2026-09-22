import { NextResponse, type NextRequest } from "next/server";
import { NOME_COOKIE, cookieValido } from "@/lib/sessao";
import { segredoDeAssinatura } from "@/lib/acesso";

/**
 * A chave que confere a assinatura do cookie vem do banco, porque a senha
 * passou a poder ser trocada pela tela. Fica guardada por alguns segundos
 * para a navegação normal não pagar uma ida ao banco a cada página.
 *
 * O prazo não atrasa a queda das sessões: quem falha a conferência releva o
 * cache e pergunta de novo (veja `sessaoValida`). O cache só encurta o
 * caminho de quem está com o cookie em dia.
 */
const VALIDADE_DO_CACHE = 10_000;
let cache: { segredo: string | null; em: number } | null = null;

async function segredoComCache(fresco = false): Promise<string | null> {
  if (!fresco && cache && Date.now() - cache.em < VALIDADE_DO_CACHE) return cache.segredo;
  const segredo = await segredoDeAssinatura();
  cache = { segredo, em: Date.now() };
  return segredo;
}

/**
 * Confere a assinatura do cookie, e só desiste depois de reler a chave.
 *
 * Sem a releitura, quem acabou de trocar a senha era jogado para a tela de
 * senha: a rota emite um cookie novo, assinado com a chave nova, mas o proxy
 * ainda estava com a anterior guardada e recusava justamente o cookie bom.
 *
 * A releitura só acontece quando a conferência falha, então a navegação
 * normal continua sem encostar no banco. Para uma sessão de OUTRO computador,
 * que falha por estar mesmo vencida, ela custa uma leitura — e é essa
 * leitura que traz a chave nova e derruba a sessão de vez.
 */
async function sessaoValida(cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;

  const guardado = await segredoComCache();
  if (guardado && (await cookieValido(cookie, guardado))) return true;

  const atual = await segredoComCache(true);
  return Boolean(atual) && atual !== guardado && (await cookieValido(cookie, atual!));
}

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

  // Sem senha configurada o app fica aberto: é melhor do que travar o plantão
  // por uma variável de ambiente esquecida. A tela de entrada avisa disso.
  if (!(await segredoComCache())) return NextResponse.next();

  if (await sessaoValida(req.cookies.get(NOME_COOKIE)?.value)) {
    const resposta = NextResponse.next();
    // Sem isto o bloqueio nao vale: o navegador guarda o HTML e, ao voltar,
    // reexibe a pagina do proprio cache sem consultar o servidor — e este
    // proxy nunca roda. `no-store` tambem desliga o bfcache da pagina.
    // O funcionamento offline nao depende deste cache e sim do service
    // worker, que tem armazenamento proprio.
    resposta.headers.set("Cache-Control", "no-store, must-revalidate");
    return resposta;
  }

  // Uma chamada de API sem sessão precisa de 401, não de um redirecionamento:
  // o fetch seguiria o redirect e receberia o HTML da tela de entrada como se
  // fosse resposta válida, e o cliente engoliria isso como dado.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "sem_sessao" }, { status: 401 });
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
