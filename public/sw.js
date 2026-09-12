/**
 * Service worker do PS JAPA.
 *
 * O app precisa abrir com o Wi-Fi do hospital fora. Estratégia:
 *  - navegação: rede primeiro (pega atualização), cache se a rede falhar;
 *  - /_next/static: cache primeiro (os nomes já têm hash, nunca mudam);
 *  - resto: stale-while-revalidate.
 *
 * VERSAO muda a cada deploy para descartar o cache velho.
 */

const VERSAO = "20260912040944";
const CACHE = `ps-japa-${VERSAO}`;

const ROTAS = [
  "/",
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
  "/icone-maskable.png"
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Falha de uma rota não pode abortar a instalação inteira.
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
        nomes.filter((n) => n.startsWith("ps-japa-") && n !== CACHE).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

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
          const cache = await caches.open(CACHE);
          cache.put(req, resposta.clone());
          return resposta;
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match(req)) || (await cache.match("/")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Assets com hash no nome: cache primeiro, sem revalidar.
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

  // Resto: devolve o cache na hora e atualiza por trás.
  evento.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const salvo = await cache.match(req);
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
