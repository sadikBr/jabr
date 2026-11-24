/*
 * Jabr service worker: makes pages you have opened work offline.
 *
 *  - Pages (HTML): network first, so content is always fresh when online;
 *    the saved copy is used when the network fails, then the offline page.
 *  - Build assets, the Python runtime and its packages: cache first. Their
 *    URLs change whenever their contents do, so a cached copy is never stale.
 *  - Everything else (server actions, data requests) goes straight to the
 *    network. Checking an answer needs the server and says so when offline.
 *
 * Bump VERSION to throw away every cache on the next visit.
 */
const VERSION = "v1";
const PAGES = `jabr-pages-${VERSION}`;
const ASSETS = `jabr-assets-${VERSION}`;
const OFFLINE_URL = "/offline";
const PYTHON_PACKAGES = "https://cdn.jsdelivr.net/pyodide/";
const STATIC_PREFIXES = [
  "/_next/static/",
  "/pyodide/",
  "/python-worker.mjs",
  "/icons/",
  "/content/",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("jabr-") && !name.endsWith(VERSION))
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  if (url.href.startsWith(PYTHON_PACKAGES)) return true;
  return (
    url.origin === self.location.origin &&
    STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function pageNetworkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request.url, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request.url)) ??
      (await cache.match(request.url, { ignoreSearch: true })) ??
      (await cache.match(OFFLINE_URL)) ??
      Response.error()
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(pageNetworkFirst(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});

// The page tells us what to keep: itself, the pages it links to (so the next
// lesson is there when the connection is not), and the files it has already
// loaded, because on a first visit those were requested before this worker
// was in control.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "warm") return;
  const save = async (cacheName, hrefs, accept) => {
    const cache = await caches.open(cacheName);
    await Promise.all(
      (Array.isArray(hrefs) ? hrefs : []).map(async (href) => {
        try {
          const url = new URL(href, self.location.origin);
          if (!accept(url) || (await cache.match(url.href))) return;
          const response = await fetch(url.href);
          if (response.ok) await cache.put(url.href, response);
        } catch {
          // Offline or blocked: it will be saved on a later visit.
        }
      }),
    );
  };
  event.waitUntil(
    Promise.all([
      save(PAGES, data.pages, (url) => url.origin === self.location.origin),
      save(ASSETS, data.assets, isStaticAsset),
    ]),
  );
});
