/**
 * A social-network handle as a profile stores it — `duncit.events`,
 * `run_club-delhi` — without the leading `@` or the site's own address.
 *
 * This mirrors `@duncit/regex`'s `SOCIAL_HANDLE` deliberately: `server/src`
 * imports no `@duncit/*` package by design (the Docker image ships the server
 * alone), so the pattern is duplicated here rather than shared. Keep the two
 * in step. One character class, so it is linear.
 */
export const SOCIAL_HANDLE = /^[A-Za-z0-9._-]{1,100}$/;

/** The account name inside a pasted instagram.com link, if there is one. */
const INSTAGRAM_URL_HANDLE = /instagram\.com\/([^/?#\s]+)/;

/**
 * An Instagram handle as Duncit stores it: trimmed, lowercase, the `@` and any
 * `https://www.instagram.com/…/` around it dropped. '' for an empty entry.
 * The result is NOT checked here — see {@link isSocialHandle}.
 */
export function normalizeInstagramHandle(raw: string): string {
  const text = raw.trim().toLowerCase();
  const fromUrl = INSTAGRAM_URL_HANDLE.exec(text)?.[1];
  let handle = fromUrl ?? text;
  while (handle.startsWith('@')) handle = handle.slice(1);
  return handle;
}

/** Handle shape check — strip the `@` first (normalizeInstagramHandle does). */
export const isSocialHandle = (value: string): boolean => SOCIAL_HANDLE.test(value);

/**
 * An Instagram username exactly as Instagram allows it: 1-30 letters, digits,
 * underscores and dots, never starting or ending with a dot or doubling one.
 * Mirrors `@duncit/regex`'s `INSTAGRAM_HANDLE`; keep the two in step. The
 * lookahead admits one character, so it stays linear.
 */
export const INSTAGRAM_HANDLE = /^[A-Za-z0-9_](?:[A-Za-z0-9_]|\.(?=[A-Za-z0-9_])){0,29}$/;

/** Whether a handle (already normalised, no `@`) is a valid Instagram username. */
export const isInstagramHandle = (value: string): boolean => INSTAGRAM_HANDLE.test(value);
