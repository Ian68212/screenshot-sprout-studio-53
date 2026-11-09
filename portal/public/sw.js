const CACHE_NAME = "rodrinox-app-shell-v3-original-art";
const SHELL = [
  "/colaborador/",
  "/colaborador/index.html",
  "/colaborador/portal.css",
  "/colaborador/app.js",
  "/colaborador/login.js",
  "/colaborador/pwa.js",
  "/colaborador/manifest.webmanifest",
  "/colaborador/assets/login-screen-original.jpg",
  "/colaborador/assets/icon-512.png"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("rodrinox-app-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.includes("/api/") || url.pathname.includes("/site/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      if (response.ok && url.pathname.startsWith("/colaborador/")) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put("/colaborador/", copy));
      }
      return response;
    }).catch(async () => (await caches.match("/colaborador/")) || Response.error()));
    return;
  }
  if (url.pathname.startsWith("/colaborador/")) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    })));
  }
});