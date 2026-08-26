/**
 * Redis GraphQL response cache (Apollo plugin).
 *
 * Whole-response caching for two whitelists:
 *
 *  - PUBLIC_CACHEABLE_FIELDS: results depend only on the query's own arguments,
 *    never on the caller. One cache entry is shared across every requester
 *    (authed or not), keyed by `gql:pub:<hash>`.
 *  - PERSONAL_CACHEABLE_FIELDS: "my…" queries whose result is a pure function
 *    of `ctx.user.id` (ownership-scoped) plus the query's own arguments — safe
 *    to cache ONLY because the key also carries the caller's user id
 *    (`gql:u:<userId>:<hash>`), so one user's cached response can never be
 *    served to another. A request selecting a personal field is refused
 *    caching entirely when `ctx.user` is absent — the resolver's own
 *    requireAuth still runs and throws normally; the cache never gets a chance
 *    to hand an unauthenticated caller a hit that would bypass that check.
 *
 * A request is served from cache only when EVERY top-level field it selects is
 * in one of the two whitelists, so a document mixing an unlisted field (e.g.
 * `me`) with a whitelisted one is never cached.
 *
 * NEVER add a query gated by requireRole (admin/RBAC), or one whose output
 * varies by anything other than `ctx.user.id` (follow/block state, city/zone
 * scope, membership), or one carrying seat/stock/payment/coupon/coin data.
 * Each entry below was verified resolver-by-resolver before being added; a
 * query failing any of those checks stays uncached, not "cached with a note".
 *
 * Clients opt out per request with `x-no-redis: true` (portals/mWeb turn
 * `?noRedis=true` in the URL into that header) — the response then comes
 * straight from Mongo. The `x-redis-cache` response header reports
 * hit | miss | bypass for cacheable operations so the flag is verifiable from
 * browser devtools.
 *
 * Invalidation is TTL-only (REDIS_CACHE_TTL_SECONDS, default 60): an admin
 * edit to whitelisted data appears within a minute everywhere, and
 * `?noRedis=true` shows it instantly while verifying.
 */
import { createHash } from 'node:crypto';
import { HeaderMap, type ApolloServerPlugin } from '@apollo/server';
import { Kind, type OperationDefinitionNode } from 'graphql';
import type { GraphQLContext } from '../context';
import { logs } from '../observability/log';
import { cacheGet, cacheSet, redisAvailable } from './redis';

/**
 * Public queries whose result depends only on their arguments — never on the
 * caller. Anything user-, stock- or session-shaped stays OFF this list.
 */
const PUBLIC_CACHEABLE_FIELDS = new Set([
  'branding',
  'appVersionInfo',
  'publicAppSettings',
  'publicClientConfig',
  'publicFeatureFlags',
  'publicLocales',
  'publicTranslations',
  'publicRoles',
  'publicPolicies',
  // Takes no arguments and reads no caller: the policies that gate signup are
  // the same list for everybody, and the form asking for them is not signed in.
  // Its viewer-dependent sibling `myPendingPolicies` is deliberately absent —
  // a 60s stale answer there is exactly the window in which somebody accepts
  // and the gate fires at them again.
  'signupPolicies',
  // The AI Monitoring chip/dialog copy. No arguments, no caller: every upload
  // field on every surface asks for the same sentences, and an admin edit
  // reaches them all within the TTL.
  'aiMonitoringConfig',
  'publicWebsiteContent',
  'publicWebsiteNav',
  'publicPodPlans',
  'publicFaqGroups',
  'publicPartnerFaqs',
  'publicFinanceSettings',
  'publicSomethingForYou',
  // Argument-keyed but user-independent: the same shared link unfurls the same
  // card for every crawler, and a 60s TTL absorbs WhatsApp/Slack re-fetch storms.
  'linkPreview',
  // Public discovery/catalog queries — verified to take no `ctx` and to build
  // their Mongo filter solely from the query's own arguments.
  //
  // publicVenues required a prerequisite fix: venueService.publicList used the
  // same toPub() as the admin/owner view, returning owner bank_account/gstin/
  // pan/owner_email/owner_phone/owner_dob/owner_address/documents unredacted
  // to any unauthenticated caller. Adding that to a durable shared cache would
  // have turned a per-request leak into cheap bulk exfiltration. Fixed with a
  // redactForPublic() wrapper in venue.service.ts, mirroring the identical fix
  // already shipped for publicHosts (host.service.ts) — do not add
  // `publicVenue` (singular) here without the same audit; it reuses toPub via
  // getPublicById and is now also redacted, but wasn't independently verified
  // for this whitelist.
  'publicVenues',
  'publicHosts',
  'clubs',
  'clubRatings',
  'badges',
  'activePodLocationIds',
  'categories',
  'categoryTree',
]);

/**
 * "my…" queries whose result is scoped purely by `ctx.user.id` — every one of
 * these was checked to (a) call requireAuth — NOT requireRole; a requireRole
 * gate decides who may call the query at all, and a cache hit skips that
 * re-check entirely, so a query whose ACCESS (not just its data) is
 * role-scoped can never go here even if its data is identity-scoped
 * (myApiKeys was cut for exactly this reason: a role revoked after the
 * response was cached would still serve from cache with no requireRole
 * re-run) — (b) filter solely by the caller's own id (never
 * city/zone/membership/follow state), (c) carry no seat, stock, payment,
 * coupon or coin field, and (d) have no field-level resolver reading anything
 * OTHER than the same identity (myNotifications was cut because
 * Notification.action_status is a separate field resolver that reads a live,
 * independently-mutable FollowRequest document — whole-response caching
 * freezes it, showing Accept/Reject controls on an already-answered request).
 *
 * ONE audited exception to (d): PodDraft.expires_at is a field resolver over
 * the app-wide draft_retention_days setting. It is not identity-scoped, but it
 * is a date days out that the client renders as an hour countdown, so a 60s
 * stale copy cannot change what a host is told.
 */
const PERSONAL_CACHEABLE_FIELDS = new Set([
  'myPodDrafts',
  'myPodIdeas',
  'myAddresses',
]);

const DEFAULT_TTL_SECONDS = 60;

function ttlSeconds(): number {
  const parsed = Number.parseInt(process.env.REDIS_CACHE_TTL_SECONDS ?? '', 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_TTL_SECONDS;
}

type CacheScope = 'public' | 'personal';

/**
 * Whether every top-level field is whitelisted, and if so whether any of them
 * is identity-scoped — a single personal field pulls the WHOLE response into
 * the user-keyed cache (safe: personal + public data mixed together is still
 * correct per-user, just not shared across users).
 */
function operationScope(operation: OperationDefinitionNode | undefined): CacheScope | null {
  if (operation?.operation !== 'query') return null;
  let personal = false;
  for (const selection of operation.selectionSet.selections) {
    if (selection.kind !== Kind.FIELD) return null;
    const name = selection.name.value;
    if (PERSONAL_CACHEABLE_FIELDS.has(name)) {
      personal = true;
      continue;
    }
    if (!PUBLIC_CACHEABLE_FIELDS.has(name)) return null;
  }
  return personal ? 'personal' : 'public';
}

type CacheState = 'hit' | 'miss' | 'bypass';

interface CacheAttempt {
  key: string;
  state: CacheState;
}

// Keyed by the per-request context object so nothing widens GraphQLContext.
const attempts = new WeakMap<GraphQLContext, CacheAttempt>();

function cacheKey(
  scope: CacheScope,
  identity: string | null,
  query: string | undefined,
  variables: unknown,
  operationName: string | null | undefined
): string {
  const hash = createHash('sha256')
    .update(query ?? '')
    .update(JSON.stringify(variables ?? {}))
    .update(operationName ?? '')
    .digest('hex');
  // Disjoint prefixes so a public and a personal key can never collide even
  // if the underlying hash somehow did.
  return scope === 'personal' ? `gql:u:${identity}:${hash}` : `gql:pub:${hash}`;
}

export const redisResponseCachePlugin: ApolloServerPlugin<GraphQLContext> = {
  async requestDidStart() {
    return {
      async responseForOperation(ctx) {
        const scope = operationScope(ctx.operation);
        if (!scope) return null;
        const { contextValue } = ctx;
        if (contextValue.noRedis) {
          attempts.set(contextValue, { key: '', state: 'bypass' });
          return null;
        }
        // A personal field with no authenticated caller is not a cache miss —
        // it is not a caching decision at all. Let the resolver's own
        // requireAuth run and throw; serving/storing a cache entry here would
        // either have nothing to key on, or (worse) let an unauthenticated
        // request retrieve another user's cached response.
        const identity = scope === 'personal' ? contextValue.user?.id ?? null : null;
        if (scope === 'personal' && !identity) return null;
        if (!redisAvailable()) return null;
        const key = cacheKey(scope, identity, ctx.request.query, ctx.request.variables, ctx.request.operationName);
        const data = await cacheGet<Record<string, unknown>>(key);
        if (data == null) {
          attempts.set(contextValue, { key, state: 'miss' });
          logs.server.debug('redis', 'responseCache', { msg: 'miss', scope, operationName: ctx.request.operationName ?? null });
          return null;
        }
        attempts.set(contextValue, { key, state: 'hit' });
        logs.server.debug('redis', 'responseCache', { msg: 'hit', scope, operationName: ctx.request.operationName ?? null });
        return {
          http: { status: undefined, headers: new HeaderMap() },
          body: { kind: 'single', singleResult: { data } },
        };
      },
      async willSendResponse(ctx) {
        const attempt = attempts.get(ctx.contextValue);
        if (!attempt) return;
        ctx.response.http.headers.set('x-redis-cache', attempt.state);
        if (attempt.state !== 'miss' || ctx.response.body.kind !== 'single') return;
        const { data, errors } = ctx.response.body.singleResult;
        if (data && !errors) {
          await cacheSet(attempt.key, data, ttlSeconds());
        }
      },
    };
  },
};
