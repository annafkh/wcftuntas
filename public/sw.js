const CACHE_NAME = "wcf-tuntas-v2";
const OFFLINE_ASSETS = ["/manifest.webmanifest", "/favicon.ico", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }

          return Promise.resolve();
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === "navigate";
  const isStaticAsset =
    url.pathname.startsWith("/icon") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname.startsWith("/manifest") ||
    url.pathname.startsWith("/next.svg") ||
    url.pathname.startsWith("/vercel.svg") ||
    url.pathname.startsWith("/globe.svg") ||
    url.pathname.startsWith("/window.svg");

  if (isNavigation) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/login")),
    );
    return;
  }

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request));
    }),
  );
});
