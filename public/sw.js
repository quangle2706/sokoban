/*
 * Kho Nhỏ service worker: makes the game playable offline after one visit.
 * Registered only in production builds (see src/main.ts).
 *
 * Strategy:
 *   - Page loads (navigations): network first, so online players always get
 *     the newest deploy; the cached page is the offline fallback.
 *   - /assets/* (Vite output with content hashes in the file names): cache
 *     first. A changed file gets a new name, so a cached copy is never stale.
 *   - Anything else same-origin (icons, manifest): cache, refreshed in the
 *     background.
 * After each fresh page load, cached assets the new page no longer
 * references are deleted, so old builds do not pile up.
 *
 * Bump CACHE to force everyone onto a clean cache.
 */
const CACHE = 'kho-nho-v1';
const SHELL = ['./', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png'];

self.addEventListener('install', (event) => {
  // The first visit downloads the bundle before this worker exists, so
  // precache it here: read the page and cache every asset it references.
  // Without this, offline play would only work from the second visit on.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL);
      const page = await cache.match('./');
      const html = page ? await page.text() : '';
      const assets = [...new Set(html.match(/assets\/[^"'\s)]+/g) ?? [])];
      await cache.addAll(assets.map((path) => `./${path}`));
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
  } else if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});

async function networkFirstPage(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put('./', response.clone());
      pruneAssets(cache, await response.clone().text());
    }
    return response;
  } catch {
    return (await cache.match('./')) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) return cache.put(request, response.clone()).then(() => response);
      return response;
    })
    .catch(() => hit);
  event.waitUntil(refresh.catch(() => {}));
  return hit ?? (await refresh) ?? Response.error();
}

/** Delete cached /assets/ files that the current page no longer references. */
async function pruneAssets(cache, html) {
  const referenced = new Set(html.match(/assets\/[^"'\s)]+/g) ?? []);
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname;
    const i = path.indexOf('assets/');
    if (i >= 0 && !referenced.has(path.slice(i))) await cache.delete(request);
  }
}
