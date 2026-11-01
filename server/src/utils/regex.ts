/**
 * A user-typed string as a literal regex source.
 *
 * Search boxes reach Mongo as `$regex`, and a raw value there is a pattern: a
 * search of `.*` lists everything and a crafted one can pin the event loop.
 * Escaped once, here, so every list that searches by name agrees on it.
 */
export const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** Exactly six digits — a one-time code as an authenticator app shows it. */
export const SIX_DIGIT_CODE = /^\d{6}$/;

/**
 * A URL slug: lowercase letters and digits in runs joined by single dashes.
 * Mirrors `@duncit/regex`'s `URL_SLUG` (server/src imports no `@duncit/*`
 * package — keep the two in step). Linear: no nested quantifier can overlap.
 */
export const URL_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
