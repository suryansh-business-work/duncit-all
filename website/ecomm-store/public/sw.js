/*
 * The pet store's service worker: the app shell opens offline, hashed build
 * assets come from cache. It never touches the API, any non-GET request, or
 * another origin — prices, stock, carts and orders are always live.
 * Bump VERSION to drop every old cache on the next visit.
 */
const VERSION = 'v1';
const SHELL_CACHE = `ecomm-shell-${VERSION}`;
const ASSET_CACHE = `ecomm-assets-${VERSION}`;
const SHELL_URL = '/';
const NEVER_CACHE = ['/graphql', '/api', '/logs', '/healthz', '/sw.js', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(new Request(SHELL_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/** Network first; a fresh home page refreshes the stored shell; offline, the stored shell. */
async function navigate(request) {
  try {
    const response = await fetch(request);
    if (response.ok && new URL(request.url).pathname === SHELL_URL) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(SHELL_URL, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(SHELL_URL);
    if (cached) return cached;
    throw error;
  }
}

/** Hashed assets never change under their name: the cache answers once it has them. */
async function asset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((prefix) => url.pathname.startsWith(prefix))) return;
  if (request.mode === 'navigate') {
    event.respondWith(navigate(request));
    return;
  }
  if (url.pathname.startsWith('/assets/')) event.respondWith(asset(request));
});
