/* Duncit Lite service worker.
 *
 * Pages are rendered on the server for the person signed in, so page HTML is
 * NEVER cached here — on a shared phone the next person must not see the last
 * person's tickets. Only the content-hashed build assets (immutable) and the
 * offline page are cached; everything else goes to the network as if there
 * were no service worker at all.
 */
const VERSION = 'lite-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/manifest.webmanifest', '/icons/mark-192.png'];
const NEVER = ['/graphql', '/upload', '/ics/', '/mcp', '/health'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => globalThis.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => globalThis.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || NEVER.some((prefix) => url.pathname.startsWith(prefix))) return;

  // A page: always the network; the offline page only when there is no network.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL).then((page) => page ?? Response.error())));
    return;
  }

  // A hashed build asset never changes: cache first, fill on the first fetch.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok && response.type === 'basic') {
              const copy = response.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => undefined);
            }
            return response;
          }),
      ),
    );
  }
});
