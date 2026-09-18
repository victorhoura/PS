/**
 * Service worker do PS JAPA.
 *
 * O app precisa abrir com o Wi-Fi do hospital fora. Estratégia:
 *  - navegação: rede primeiro (pega atualização), cache se a rede falhar;
 *  - /_next/static: cache primeiro (os nomes já têm hash, nunca mudam);
 *  - resto: stale-while-revalidate.
 *
 * A tranca do app vive aqui também. O proxy do servidor só é consultado
 * quando há rede; sem esta marca, bastava ficar offline para o cache entregar
 * o app inteiro e o botão BLOQUEAR não bloquear coisa alguma. A marca fica
 * num cache à parte, sem versão, para sobreviver a cada deploy.
 *
 * VERSAO muda a cada deploy para descartar o cache velho.
 */

const VERSAO = "20260918153255";
const CACHE = `ps-japa-${VERSAO}`;
const CACHE_ESTADO = "ps-japa-estado";
const MARCA_TRANCA = "/__ps-tranca";

const ROTAS = [
  "/",
  "/entrar",
  "/apps",
  "/links",
  "/backup",
  "/apps/labs",
  "/apps/texto",
  "/apps/contador",
  "/c/anamnese",
  "/c/exame-fisico",
  "/c/cid",
  "/c/condutas",
  "/c/reavaliacao",
  "/c/receitas",
  "/c/farmacos",
  "/c/encaminhamento",
  "/c/notas",
  "/apps/alvarado",
  "/apps/curb-65",
  "/apps/glasgow",
  "/apps/qsofa",
  "/apps/wells-tvp"
];
const ESTATICOS = [
  "/manifest.webmanifest",
  "/icone.svg",
  "/icone-192.png",
  "/icone-512.png",
  "/icone-maskable.png",
  "/apple-touch-icon.png"
];

/** O que pode sair do cache mesmo trancado: a tela de senha e o que ela usa. */
const ABERTOS = new Set(["/entrar", ...ESTATICOS]);

// ------------------------------------------------------------ marca de tranca

async function lerTranca() {
  try {
    const cache = await caches.open(CACHE_ESTADO);
    const r = await cache.match(MARCA_TRANCA);
    return r ? (await r.text()) === "1" : false;
  } catch {
    // Na dúvida, trancado: é o lado seguro do erro.
    return true;
  }
}

async function gravarTranca(valor) {
  const cache = await caches.open(CACHE_ESTADO);
  await cache.put(MARCA_TRANCA, new Response(valor ? "1" : "0"));
}

/**
 * Sem sessão, o proxy responde a uma navegação com um redirecionamento para
 * /entrar. Numa navegação o navegador pede `redirect: "manual"`, então isso
 * chega aqui opaco — sem status nem URL de destino. Qualquer resposta que não
 * seja um 200 direto conta como trancado.
 */
function respostaDeTranca(resposta) {
  return resposta.type === "opaqueredirect" || resposta.status === 0 || resposta.redirected;
}

self.addEventListener("message", (evento) => {
  const tipo = evento.data && evento.data.tipo;
  if (tipo !== "trancar" && tipo !== "destrancar") return;
  const responder = () =>
    evento.ports && evento.ports[0] && evento.ports[0].postMessage({ ok: true });
  evento.waitUntil(
    gravarTranca(tipo === "trancar").then(responder, responder),
  );
});

// ------------------------------------------------------------ ciclo de vida

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Falha de uma rota não pode abortar a instalação inteira. Trancado,
      // as rotas do app respondem com redirecionamento e simplesmente não
      // entram no cache — que é o que se quer.
      await Promise.allSettled([...ROTAS, ...ESTATICOS].map((u) => cache.add(u)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(
        nomes
          .filter((n) => n.startsWith("ps-japa-") && n !== CACHE && n !== CACHE_ESTADO)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

// ------------------------------------------------------------ requisições

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: rede primeiro, cache como rede de segurança.
  if (req.mode === "navigate") {
    evento.respondWith(
      (async () => {
        try {
          const resposta = await fetch(req);

          if (respostaDeTranca(resposta)) {
            await gravarTranca(true);
            return resposta;
          }

          // Guardar um redirecionamento quebra a navegação servida do cache,
          // e guardar erro não ajuda ninguém: só 200 limpo entra.
          if (resposta.ok && url.pathname !== "/entrar") {
            if (await lerTranca()) await gravarTranca(false);
            // A cópia sai agora, mas a gravação corre por fora: esperar por
            // ela seguraria o HTML inteiro antes do primeiro byte da página.
            const copia = resposta.clone();
            evento.waitUntil(
              caches
                .open(CACHE)
                .then((cache) => cache.put(req, copia))
                .catch(() => {}),
            );
          }
          return resposta;
        } catch {
          const cache = await caches.open(CACHE);
          if (await lerTranca()) {
            // Sem rede e trancado: só a tela de senha, que confere a senha
            // pelo verificador gravado neste navegador.
            return (await cache.match("/entrar")) || Response.error();
          }
          // ignoreSearch: a rota guardada é "/c/receitas", e a navegação pode
          // trazer "?de=..." ou o parâmetro que o navegador quiser pendurar.
          return (
            (await cache.match(req, { ignoreSearch: true })) ||
            (await cache.match("/")) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Assets com hash no nome: cache primeiro, sem revalidar. Não têm o que
  // proteger — são o mesmo JS e CSS que qualquer visitante baixa.
  if (url.pathname.startsWith("/_next/static/")) {
    evento.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const salvo = await cache.match(req);
        if (salvo) return salvo;
        const resposta = await fetch(req);
        if (resposta.ok) cache.put(req, resposta.clone());
        return resposta;
      })(),
    );
    return;
  }

  // Resto: devolve o cache na hora e atualiza por trás. Trancado, o cache não
  // pode responder — os payloads RSC guardados trazem o conteúdo das páginas.
  evento.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const podeUsarCache = ABERTOS.has(url.pathname) || !(await lerTranca());
      const salvo = podeUsarCache ? await cache.match(req) : undefined;
      const rede = fetch(req)
        .then((resposta) => {
          if (resposta.ok) cache.put(req, resposta.clone());
          return resposta;
        })
        .catch(() => salvo || Response.error());
      return salvo || rede;
    })(),
  );
});
