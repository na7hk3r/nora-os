const CACHE = "nora-web-v2";
// El sitio se sirve en una subruta (base '/nora-os/web/'); el scope del SW
// ya apunta a esa raíz, así que todas las URLs se resuelven contra él.
const SCOPE = self.registration.scope;
const PRECACHE = [SCOPE, SCOPE + "index.html", SCOPE + "sql-wasm.wasm", SCOPE + "manifest.webmanifest", SCOPE + "icons/icon-192.png", SCOPE + "icons/icon-512.png", SCOPE + "icons/icon-maskable-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to cached shell (offline).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SCOPE + "index.html", copy));
          return res;
        })
        .catch(() => caches.match(SCOPE + "index.html"))
    );
    return;
  }

  // wasm is immutable: cache-first.
  if (url.pathname.endsWith(".wasm")) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      }))
    );
    return;
  }

  // Other same-origin GET: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((hit) => {
      const fetchPromise = fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => hit);
      return hit || fetchPromise;
    })
  );
});