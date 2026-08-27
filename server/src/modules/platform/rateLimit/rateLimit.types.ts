/**
 * The vocabulary of the rate limiter, in one place.
 *
 * Every value here is rendered in the Tech portal's Rate Limiting console and
 * stored on a rule, so the enum names ARE the API. The console reads the lists
 * from the server (`rateLimitOptions`) rather than repeating them, which is
 * what makes a value added here appear in the rule editor without a portal
 * release.
 */

/** Which transport the request arrived on. */
export type RateLimitChannel = 'GRAPHQL' | 'REST' | 'SOCKET';

/** The declared client family (`x-duncit-surface`), normalised. */
export const RATE_LIMIT_SURFACES = [
  'NATIVE',
  'MWEB',
  'PORTAL',
  'ADMIN_PORTAL',
  'WEBSITE',
  'API',
  'SERVER',
  'UNKNOWN',
] as const;
export type RateLimitSurface = (typeof RATE_LIMIT_SURFACES)[number];

/** What the counter is kept per. */
export const RATE_LIMIT_KEYS = [
  'IP',
  'USER',
  'DEVICE',
  'IP_USER',
  'API_KEY',
  'SYSTEM',
  'GLOBAL',
] as const;
export type RateLimitKeyBy = (typeof RATE_LIMIT_KEYS)[number];

/** How the allowance is counted down. */
export const RATE_LIMIT_ALGORITHMS = ['FIXED_WINDOW', 'SLIDING_WINDOW', 'TOKEN_BUCKET'] as const;
export type RateLimitAlgorithm = (typeof RATE_LIMIT_ALGORITHMS)[number];

/** Whether a breach is refused or merely recorded. */
export const RATE_LIMIT_MODES = ['ENFORCE', 'MONITOR'] as const;
export type RateLimitMode = (typeof RATE_LIMIT_MODES)[number];

/** Which callers the rule speaks to. */
export const RATE_LIMIT_AUDIENCES = ['ALL', 'ANONYMOUS', 'AUTHENTICATED'] as const;
export type RateLimitAudience = (typeof RATE_LIMIT_AUDIENCES)[number];

/** GraphQL operation kinds a rule can narrow to. */
export const RATE_LIMIT_OPERATION_TYPES = ['ALL', 'QUERY', 'MUTATION', 'SUBSCRIPTION'] as const;
export type RateLimitOperationType = (typeof RATE_LIMIT_OPERATION_TYPES)[number];

/** The wildcard accepted anywhere a rule names a surface, app, path or field. */
export const ANY = '*';

/** One inbound request, reduced to everything a rule can match on. */
export interface RateLimitRequest {
  channel: RateLimitChannel;
  surface: RateLimitSurface;
  /** Portal key (`tech`), `mweb`, `native`, a website key, or `-`. */
  app: string;
  /** GraphQL: the FIRST top-level field, which is what a breach is filed under. */
  operation?: string;
  /**
   * Every top-level field the document selects.
   *
   * A rule naming operations matches when ANY of them is selected, and the
   * request is still counted ONCE — "requests per minute" has to mean HTTP
   * requests, or a client batching two fields into one round trip would spend
   * twice the allowance for the same amount of traffic.
   */
  fields?: string[];
  operationType?: Exclude<RateLimitOperationType, 'ALL'>;
  /** REST: the request path. */
  path?: string;
  method?: string;
  ip: string;
  userId?: string;
  roles: string[];
  deviceId?: string;
  apiKeyId?: string;
}

/** What the limiter decided, and everything the caller needs to say why. */
export interface RateLimitDecision {
  allowed: boolean;
  /** The rule that refused (or, in MONITOR, would have). */
  rule_id?: string;
  rule_name?: string;
  /** True when a rule was breached but its mode only records the breach. */
  monitored?: boolean;
  message?: string;
  limit?: number;
  remaining?: number;
  /** Seconds until the caller may retry. */
  retry_after?: number;
}
