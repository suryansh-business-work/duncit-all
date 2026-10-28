/** Bump with sw.js's VERSION so a returning visitor picks up the new worker. */
const SW_URL = '/sw.js?v=lite-v1';

/**
 * Install Duncit Lite as an app: the service worker makes it installable and
 * gives it an offline page. Only in a production build — the Vite dev server
 * serves modules the worker must never cache. A failed registration leaves the
 * site working exactly as a normal page, so it is reported, not surfaced.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  globalThis.addEventListener('load', () => {
    navigator.serviceWorker.register(SW_URL, { scope: '/' }).catch((error: unknown) => {
      console.warn('[lite] service worker registration failed', error);
    });
  });
}
