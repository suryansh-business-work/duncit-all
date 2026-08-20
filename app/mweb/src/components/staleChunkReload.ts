/**
 * Surviving our own deploys.
 *
 * Every route in AppRoutes is a `lazy(() => import(...))`, and Vite names those
 * chunks by content hash. A deploy replaces the whole `assets/` directory, so a
 * tab that was already open is holding an index.html whose chunk names are now
 * 404s — the moment that visitor navigates, the import rejects with "Failed to
 * fetch dynamically imported module" and the error boundary paints a crash
 * screen over a perfectly healthy site.
 *
 * Its Try again button cannot help: React caches the rejected lazy payload, so
 * re-rendering re-throws the same rejection. The only thing that fixes a stale
 * document is a fresh one.
 */

/**
 * Marker that a reload has already been spent on this tab. Session-scoped
 * deliberately: the guard must survive the reload it triggers (a module-level
 * variable would not) and must not outlive the tab (a later, unrelated deploy
 * deserves its own reload).
 */
const RELOAD_GUARD_KEY = 'duncit.staleChunkReloaded';

/**
 * The wording browsers use when a module request fails. Chrome and Firefox name
 * the module, Safari says "Importing a module script failed", and a chunk that
 * 404s to an HTML error page reports a MIME-type refusal instead — all three
 * are the same event, so all three are matched.
 */
const STALE_CHUNK_HINTS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'expected a javascript module script',
];

/** Whether this error is a chunk the current document can no longer load. */
export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (!message) return false;
  return STALE_CHUNK_HINTS.some((hint) => message.includes(hint));
}

/**
 * Reload once to pick up the new index.html, and report whether the caller
 * should keep quiet. Returns false when this is not a stale chunk, or when the
 * tab has already reloaded for one — a second failure is a real outage (the
 * asset is genuinely missing, the network is down), and that earns the crash
 * screen rather than a reload loop.
 */
export function reloadForStaleChunk(error: unknown): boolean {
  if (!isStaleChunkError(error)) return false;
  try {
    if (globalThis.sessionStorage?.getItem(RELOAD_GUARD_KEY)) return false;
    globalThis.sessionStorage?.setItem(RELOAD_GUARD_KEY, '1');
  } catch {
    // Private mode / blocked storage: without a guard a reload could loop, so
    // the crash screen is the safer answer.
    return false;
  }
  globalThis.location.reload();
  return true;
}
