/* FitFlow — service worker gerado no build (vite.config.ts → fitflowServiceWorker).
 *
 * Objetivo: depois da primeira visita, o app abre mesmo sem internet. Os dados do
 * usuário NÃO passam por aqui: eles ficam no IndexedDB. Este arquivo só guarda os
 * arquivos do próprio app (HTML, JS, CSS, fonte e ícones).
 *
 * - Navegação: rede primeiro (pega versões novas), com cópia em cache como reserva.
 * - Arquivos com hash em /assets/: cache primeiro (nunca mudam de conteúdo).
 * - Ao publicar uma nova versão, o cache antigo é apagado na ativação.
 */
const VERSION = "__VERSION__";
const BASE = __BASE__;
const PRECACHE = __PRECACHE__.map((file) => BASE + file);
const CACHE = `fitflow-${VERSION}`;
const SHELL = BASE + "index.html";
const NAVIGATION_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("fitflow-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const network = fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(SHELL, copy));
      }
      return response;
    });
    event.respondWith(
      withTimeout(network, NAVIGATION_TIMEOUT_MS).catch(() =>
        caches.match(SHELL).then((cached) => cached || network),
      ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && url.pathname.startsWith(BASE + "assets/")) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
