/**
 * The words behind the server's enum values.
 *
 * The option LISTS come from `rateLimitOptions`, so a value added on the server
 * appears in the editor without a portal release — but a raw `SLIDING_WINDOW`
 * is not something to put in front of an operator. This maps each known value
 * to its translation key and hands anything unrecognised back verbatim, which
 * is exactly what a value the portal has not been taught yet should look like.
 *
 * The keys are literals in a constant map on purpose: `t()` is called with the
 * looked-up key rather than a composed string, which is what keeps both halves
 * of the rule-38 gate green (see CLAUDE.md rule 38).
 */

type Translate = (key: string) => string;

/** Shared by surface, channel, audience and operation type — all mean "any". */
const ALL_KEY = 'tech.rateLimit.value.all';

export const ENUM_LABEL_KEYS: Record<string, string> = {
  ALL: ALL_KEY,

  // surfaces
  NATIVE: 'tech.rateLimit.value.native',
  MWEB: 'tech.rateLimit.value.mweb',
  PORTAL: 'tech.rateLimit.value.portal',
  ADMIN_PORTAL: 'tech.rateLimit.value.adminPortal',
  WEBSITE: 'tech.rateLimit.value.website',
  API: 'tech.rateLimit.value.api',
  SERVER: 'tech.rateLimit.value.server',
  UNKNOWN: 'tech.rateLimit.value.unknown',

  // channels
  GRAPHQL: 'tech.rateLimit.value.graphql',
  REST: 'tech.rateLimit.value.rest',
  SOCKET: 'tech.rateLimit.value.socket',

  // counted per
  IP: 'tech.rateLimit.value.ip',
  USER: 'tech.rateLimit.value.user',
  DEVICE: 'tech.rateLimit.value.device',
  IP_USER: 'tech.rateLimit.value.ipUser',
  API_KEY: 'tech.rateLimit.value.apiKey',
  SYSTEM: 'tech.rateLimit.value.system',
  GLOBAL: 'tech.rateLimit.value.global',

  // algorithms
  FIXED_WINDOW: 'tech.rateLimit.value.fixedWindow',
  SLIDING_WINDOW: 'tech.rateLimit.value.slidingWindow',
  TOKEN_BUCKET: 'tech.rateLimit.value.tokenBucket',

  // modes
  ENFORCE: 'tech.rateLimit.value.enforce',
  MONITOR: 'tech.rateLimit.value.monitor',

  // audiences
  ANONYMOUS: 'tech.rateLimit.value.anonymous',
  AUTHENTICATED: 'tech.rateLimit.value.authenticated',

  // operation types
  QUERY: 'tech.rateLimit.value.query',
  MUTATION: 'tech.rateLimit.value.mutation',
  SUBSCRIPTION: 'tech.rateLimit.value.subscription',

  // where the counters live
  REDIS: 'tech.rateLimit.value.redis',
  MEMORY: 'tech.rateLimit.value.memory',
};

/** One enum value in words, or the value itself when it is not a known one. */
export function enumLabel(t: Translate, value: string): string {
  const key = ENUM_LABEL_KEYS[value];
  return key ? t(key) : value;
}

/** Turn a server enum list into the { value, label } shape a select wants. */
export function enumOptions(
  t: Translate,
  values: readonly string[],
): Array<{ value: string; label: string }> {
  return values.map((value) => ({ value, label: enumLabel(t, value) }));
}

/** "600 / 60s" — the allowance in the shortest honest form for a table cell. */
export function allowance(limit: number, windowSeconds: number): string {
  return `${limit} / ${windowSeconds}s`;
}
