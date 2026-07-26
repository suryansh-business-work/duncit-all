/**
 * The fallback-icon contract.
 *
 * Every branding image the apps render comes from a server URL that can fail —
 * the CDN is down, the admin cleared the field, the device is offline. Each
 * project therefore ships a local copy of every icon named here, and renders
 * that copy when the URL fails.
 *
 * The names are the contract. A project's manifest is typed
 * `Record<FallbackIconName, T>`, so:
 *   - a MISSING FILE fails the bundler (Vite/Rollup for web, Metro for native),
 *   - a MISSING NAME fails `tsc`.
 * Both are compile errors, which is exactly what point 3 asked for: you cannot
 * ship a build whose fallbacks are incomplete.
 */

export const FALLBACK_ICON_NAMES = [
  /** App/brand mark — stands in for logo_url and the per-surface *_logo_url. */
  'logo',
  /** Browser/app icon — stands in for the per-surface *_favicon_url. */
  'favicon',
  /** Splash artwork — stands in for the per-surface *_splash_url. */
  'splash',
  /** The synthetic "All" tab icon in the home vibe tabber. */
  'all-vibe',
  /** Neutral placeholder for any image that fails to load (products, media). */
  'placeholder',
  /** Generic festive icon when an occasion has no art of its own. */
  'occasion',
] as const;

export type FallbackIconName = (typeof FALLBACK_ICON_NAMES)[number];

/** A project's local fallback bundle: every name, mapped to that project's
 * asset representation (a URL string on web, a module id on native). */
export type FallbackIconManifest<T> = Record<FallbackIconName, T>;

/** Narrow an untrusted string (e.g. an admin binding) to a known icon name. */
export function toFallbackIconName(value: string | null | undefined): FallbackIconName | null {
  return FALLBACK_ICON_NAMES.includes(value as FallbackIconName)
    ? (value as FallbackIconName)
    : null;
}

/**
 * Pick what to render for an icon slot: the admin's URL when it is usable, else
 * the project's bundled fallback.
 *
 * `failed` lets a caller report a URL that errored at runtime (an <img> onError
 * or an RN onError), so the next render falls back instead of retrying a dead
 * URL forever.
 */
export function resolveIconSource<T>(
  url: string | null | undefined,
  fallback: T,
  failed = false,
): { source: string | T; isFallback: boolean } {
  const trimmed = (url ?? '').trim();
  if (!trimmed || failed) return { source: fallback, isFallback: true };
  return { source: trimmed, isFallback: false };
}
