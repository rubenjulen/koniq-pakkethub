/* BugaWuga service worker — installable PWA + offline app-shell.
 * Strategy:
 *  - Navigations: network-first, fall back to cached shell (/offline) when offline.
 *  - Static assets (icons, manifest): cache-first.
 *  - Never cache API/auth/mutations (POST or /api/*): always straight to network.
 */
const VERSION = "pakkethub-v1";
const SHELL = "shell-" + VERSION;
const ASSETS = "assets-" + VERSION;
const SHELL_URLS = ["/offline", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_URLS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never intercept mutations
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // dynamic data straight to network

  // App-shell navigation: network-first with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req).then((hit) => hit || caches.match("/offline"))
      )
    );
    return;
  }

  // Static assets: cache-first, then populate.
  if (["style", "script", "image", "font"].includes(req.destination)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(ASSETS).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          }).catch(() => hit)
      )
    );
  }
});
