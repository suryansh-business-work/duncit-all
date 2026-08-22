import crypto from 'node:crypto';

/**
 * The @handle that stands in for a Mongo id in a profile URL.
 *
 * Every account has one. It is minted from the person's name the moment the
 * account is created, it is globally unique, and it is what
 * `duncit.com/u/<username>` carries — which is why the shape below is narrow
 * enough to survive a URL untouched. An id in that slot is unreadable, tells a
 * crawler nothing, and leaks the row's storage key into every share.
 *
 * The SAME pattern ships to the clients as `USERNAME` from `@duncit/regex`, so
 * a handle mWeb's field accepts is a handle this file accepts. `server/src`
 * imports no `@duncit/*` package by design (rule 40), so the two are mirrored
 * rather than shared — keep them in sync.
 */
export const USERNAME_REGEX = /^(?=.{3,30}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

/**
 * Handles nobody may take, because the profile URL shares its namespace with
 * the app's own paths and with the words a support reply would be believed in.
 *
 * `/u/<handle>` is its own segment today, so a collision is not routable — but
 * a handle reading `admin` or `support` is impersonation whether or not it
 * resolves, and reserving them costs nothing.
 */
const RESERVED = new Set([
  'about', 'account', 'accounts', 'admin', 'administrator', 'api', 'app', 'auth',
  'billing', 'blog', 'cart', 'checkout', 'club', 'clubs', 'contact', 'duncit',
  'earn', 'explore', 'faq', 'faqs', 'feed', 'follow', 'help', 'home', 'host',
  'hosts', 'legal', 'login', 'logout', 'me', 'menu', 'moderator', 'new', 'null',
  'official', 'partner', 'partners', 'payment', 'payments', 'pod', 'pods',
  'policies', 'policy', 'post', 'posts', 'privacy', 'profile', 'register',
  'root', 'search', 'settings', 'shop', 'signin', 'signup', 'staff', 'support',
  'system', 'team', 'terms', 'u', 'undefined', 'user', 'users', 'venue',
  'venues', 'wallet',
]);

export const isReservedUsername = (value: string): boolean => RESERVED.has(value);

/**
 * Alphabet for the random tail. `0/o` and `1/l` are left out: a handle is read
 * aloud and typed from a screenshot, and those four are where that goes wrong.
 */
const SUFFIX_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const SUFFIX_LENGTH = 4;

/** A short random tail, so two people called Ravi both get a handle. */
export function randomSuffix(): string {
  let out = '';
  for (let i = 0; i < SUFFIX_LENGTH; i += 1) {
    out += SUFFIX_ALPHABET[crypto.randomInt(0, SUFFIX_ALPHABET.length)];
  }
  return out;
}

/** Longest name slug that still leaves room for `-` + the random tail. */
const MAX_BASE_LENGTH = USERNAME_MAX_LENGTH - SUFFIX_LENGTH - 1;

/**
 * A person's name reduced to the handle alphabet.
 *
 * Accents are folded to their base letter first (`Renée` → `renee`) rather than
 * stripped, which is the difference between a recognisable handle and `ren`.
 * Everything else that is not a letter or digit becomes a boundary, and the
 * boundaries collapse into single hyphens.
 */
/**
 * Strip leading and trailing `-` in one linear pass.
 *
 * An anchored `-+$` makes the engine retry from every start position on a run
 * that never reaches the end of the string, which is quadratic. Scanning the
 * two ends is O(n) and says the same thing.
 */
function trimDashes(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && value.charAt(start) === '-') start += 1;
  while (end > start && value.charAt(end - 1) === '-') end -= 1;
  return value.slice(start, end);
}

export function slugifyName(...parts: Array<string | null | undefined>): string {
  const raw = parts.filter(Boolean).join(' ');
  const base = trimDashes(
    raw
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-'),
  );
  // The slice can re-expose a trailing dash, so trim again after it.
  return trimDashes(base.slice(0, MAX_BASE_LENGTH));
}

/** The base every generated handle is built on — never empty, never reserved. */
function baseFor(first?: string | null, last?: string | null): string {
  const slug = slugifyName(first, last);
  if (slug.length >= USERNAME_MIN_LENGTH && !isReservedUsername(slug)) return slug;
  // A name that leaves nothing usable (all emoji, a single letter, or a word
  // we reserve) still has to produce a handle — `duncit` reads as ours, which
  // for an account we generated it for is exactly right.
  return slug.length > 0 && !isReservedUsername(slug) ? `${slug}-duncit` : 'duncit';
}

export interface UsernameCandidateOptions {
  /** Answers "is this handle already taken?". Injected so this file stays pure. */
  isTaken: (candidate: string) => Promise<boolean>;
  /** Attempts before widening the tail. Each attempt is one indexed lookup. */
  maxAttempts?: number;
}

/**
 * Mint a free handle for a name.
 *
 * The suffix is random rather than a counter: a counter tells anyone who reads
 * `ravi-7` that there are six other Ravis and lets them enumerate the rest, and
 * it needs a read-modify-write that two signups can race on. After
 * `maxAttempts` collisions the tail grows instead of looping forever — with a
 * 32-character alphabet that point is never reached in practice, and if it
 * somehow is, a longer tail fixes it rather than an exception.
 *
 * The unique index is still the authority. This function narrows the odds; the
 * caller must handle E11000 (see `claimUsername` in user.service).
 */
export async function generateUsername(
  first: string | null | undefined,
  last: string | null | undefined,
  options: Readonly<UsernameCandidateOptions>
): Promise<string> {
  const base = baseFor(first, last);
  const maxAttempts = options.maxAttempts ?? 8;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = `${base}-${randomSuffix()}`;
    if (!(await options.isTaken(candidate))) return candidate;
  }
  return `${base}-${randomSuffix()}${randomSuffix()}`.slice(0, USERNAME_MAX_LENGTH);
}

/** Why a typed handle was refused, or null when it is fine. */
export type UsernameRejection = 'FORMAT' | 'RESERVED';

/**
 * Normalize what somebody typed, then say whether it is usable.
 *
 * Trimming and lower-casing happen HERE rather than in the resolver so the
 * availability check and the save agree on what the string is — a check that
 * ran on `Ravi ` and a save that ran on `ravi` is how "available" turns into a
 * duplicate-key error in front of the user.
 */
export function normalizeUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function checkUsername(value: string): UsernameRejection | null {
  if (!USERNAME_REGEX.test(value)) return 'FORMAT';
  if (isReservedUsername(value)) return 'RESERVED';
  return null;
}
