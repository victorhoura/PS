/**
 * Service worker do PS JAPA — e ele não guarda nada.
 *
 * Até aqui este arquivo mantinha um cache das páginas para o app abrir sem
 * rede. Isso acabou: o app roda também em computador de uso compartilhado, e
 * um cache com as páginas já autenticadas é rastro para quem sentar depois.
 * O preço, assumido: sem conexão o app não abre.
 *
 * O worker continua existindo por um motivo só — é o que faz o navegador
 * oferecer "instalar aplicativo". Ele repassa toda requisição para a rede sem
 * tocar em nada, e na ativação apaga os caches que as versões anteriores
 * deixaram nas máquinas onde o app já rodou.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      // Limpeza das versões antigas, que cacheavam páginas e os formulários.
      const nomes = await caches.keys();
      await Promise.all(nomes.map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/**
 * Repasse puro. Precisa existir para o app ser instalável; não pode guardar
 * nada, que é o ponto.
 */
self.addEventListener("fetch", (evento) => {
  evento.respondWith(fetch(evento.request));
});
