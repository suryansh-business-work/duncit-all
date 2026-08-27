import { ANY, RATE_LIMIT_SURFACES, type RateLimitRequest, type RateLimitSurface } from './rateLimit.types';
import type { IRateLimitRule } from './rateLimit.model';

/**
 * Pure matching: does this rule govern this request, and what does it count per.
 *
 * Kept away from the enforcer so both questions can be answered — and tested —
 * without a database, a clock or a counter store. The enforcer only sequences
 * them.
 */

const SURFACE_SET = new Set<string>(RATE_LIMIT_SURFACES);

/** The declared surface header, reduced to one the rules can name. */
export function normaliseSurface(raw?: string | null): RateLimitSurface {
  const value = (raw ?? '').trim().toUpperCase();
  if (SURFACE_SET.has(value)) return value as RateLimitSurface;
  return 'UNKNOWN';
}

/** The declared app header, reduced to a key. Empty becomes a dash, never blank. */
export function normaliseApp(raw?: string | null): string {
  const value = (raw ?? '').trim().toLowerCase().slice(0, 40);
  return /^[a-z0-9][a-z0-9-]*$/.test(value) ? value : '-';
}

/**
 * Glob match supporting `*` only, which is every wildcard a path or a field
 * name needs. Anchored, so `/upload` does not match `/uploads-admin`.
 */
export function globMatches(pattern: string, value: string): boolean {
  const trimmed = pattern.trim();
  if (!trimmed || trimmed === ANY) return true;
  if (!trimmed.includes(ANY)) return trimmed.toLowerCase() === value.toLowerCase();
  const escaped = trimmed.replace(/[.+?^${}()|[\]\\]/g, String.raw`\$&`);
  const source = `^${escaped.split(ANY).join('.*')}$`;
  return new RegExp(source, 'i').test(value);
}

/** Any pattern in the list matches. An EMPTY list means "no restriction". */
function listMatches(patterns: string[], value?: string): boolean {
  if (patterns.length === 0) return true;
  if (value === undefined) return false;
  return patterns.some((p) => globMatches(p, value));
}

/** Any pattern matches any of the values. An empty pattern list means "all". */
function anyFieldMatches(patterns: string[], values: string[]): boolean {
  if (patterns.length === 0) return true;
  return values.some((value) => patterns.some((p) => globMatches(p, value)));
}

/** Is this caller one the rule is written for (anonymous / signed in / both)? */
function audienceMatches(rule: IRateLimitRule, req: RateLimitRequest): boolean {
  if (rule.audience === 'ANONYMOUS') return !req.userId;
  if (rule.audience === 'AUTHENTICATED') return Boolean(req.userId);
  return true;
}

/** Does this rule govern this request at all? */
export function ruleMatches(rule: IRateLimitRule, req: RateLimitRequest): boolean {
  if (!rule.enabled) return false;
  if (rule.channel !== 'ALL' && rule.channel !== req.channel) return false;
  if (rule.surface !== 'ALL' && rule.surface !== req.surface) return false;
  if (!globMatches(rule.app, req.app)) return false;
  if (!audienceMatches(rule, req)) return false;

  if (req.channel === 'GRAPHQL') {
    if (rule.operation_type !== 'ALL' && rule.operation_type !== req.operationType) return false;
    const fields = req.fields?.length ? req.fields : [req.operation ?? ''];
    return anyFieldMatches(rule.operations, fields);
  }
  // REST and socket: paths and methods. A rule naming GraphQL operations only
  // is not a rule about a REST route, so it must not silently catch one.
  if (rule.operations.length > 0) return false;
  if (!listMatches(rule.paths, req.path)) return false;
  return listMatches(
    rule.methods.map((m) => m.toUpperCase()),
    (req.method ?? '').toUpperCase(),
  );
}

/**
 * The identity the allowance is kept per, as `<kind>:<value>`.
 *
 * Returns null when the request cannot supply that identity — an unauthenticated
 * caller under a per-user rule, a browser under a per-API-key rule. A rule that
 * cannot be keyed is SKIPPED rather than collapsed onto a shared bucket, which
 * would limit every anonymous visitor as if they were one person.
 */
export function limitKey(rule: IRateLimitRule, req: RateLimitRequest): string | null {
  switch (rule.key_by) {
    case 'IP':
      return req.ip ? `ip:${req.ip}` : null;
    case 'USER':
      return req.userId ? `user:${req.userId}` : null;
    case 'DEVICE':
      return req.deviceId ? `device:${req.deviceId}` : null;
    case 'API_KEY':
      return req.apiKeyId ? `key:${req.apiKeyId}` : null;
    case 'IP_USER':
      // Signed in, this is per-account; signed out, per-address. One rule then
      // covers a login form the same way whoever is behind it arrives.
      if (req.userId) return `user:${req.userId}`;
      return req.ip ? `ip:${req.ip}` : null;
    case 'SYSTEM':
      return `sys:${req.surface}:${req.app}`;
    default:
      return 'all';
  }
}

/** Is this caller exempt from this rule (its own lists, plus the global ones)? */
export function isExempt(
  rule: IRateLimitRule,
  req: RateLimitRequest,
  globalRoles: string[],
): boolean {
  const roles = new Set([...rule.exempt_roles, ...globalRoles]);
  if (req.roles.some((role) => roles.has(role))) return true;
  return rule.exempt_ips.some((pattern) => globMatches(pattern, req.ip));
}

/** Is this address on a global list? Globs allowed, so a /24 is `10.1.2.*`. */
export function ipListed(list: string[], ip: string): boolean {
  return list.some((pattern) => globMatches(pattern, ip));
}
