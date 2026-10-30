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
 *
 * The ONE exception is the Website CMS (`CMS_EPOCH_FIELDS`): its keys carry
 * the CMS epoch, which every CMS write bumps (bumpCmsEpoch), so a publish is
 * live on the next request instead of up to a TTL later.
 */
import { createHash } from 'node:crypto';
import { HeaderMap, type ApolloServerPlugin } from '@apollo/server';
import { Kind, type OperationDefinitionNode } from 'graphql';
import type { GraphQLContext } from '../context';
import { logs } from '../observability/log';
import { canSeeHidden } from '../utils/hidden';
import { cacheGet, cacheIncr, cacheSet, redisAvailable } from './redis';

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
  // Every website's home-page Reel Slider. Argument-keyed (site), no auth, no
  // ctx; a Website portal edit reaches the sliders within the TTL.
  'publicWebsiteReels',
  // Every website's home-page Earn with Duncit section and floating pill. Same
  // shape: argument-keyed (site), no auth, no ctx; a portal save lands within the TTL.
  'publicWebsiteEarnSection',
  // The website CMS renderer: every page view of every CMS site. Argument-keyed
  // (host, path, page), no auth, no ctx — a publish reaches the site within the
  // TTL. cmsPreview (drafts) is role-gated and deliberately NOT listed.
  'cmsRender',
  'cmsSitemap',
  'cmsErrorPage',
  'publicPodPlans',
  'publicFaqGroups',
  'publicPartnerFaqs',
  'publicFinanceSettings',
  'publicSomethingForYou',
  // Argument-keyed but user-independent: the same shared link unfurls the same
  // card for every crawler, and a 60s TTL absorbs WhatsApp/Slack re-fetch storms.
  'linkPreview',
  // Every Duncit website's home rail of upcoming pods. Argument-keyed (limit),
  // no auth, no ctx; returns only public card fields (pod.websiteRail.ts), and
  // a new or changed pod reaches the rails within the TTL.
  'websiteUpcomingPods',
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
  // The city picker. No auth and no ctx read: `active_club_count` only memoises
  // an aggregate on the context. The admin grid reads `locationsTable`, which
  // stays off this list, so an edit there is never served stale. The picker's
  // `subscriber_count` may lag by the TTL; the subscribe page's live count is
  // `locationLaunchStatus`, which — like the admin waitlist queries — stays off.
  'locations',
  // Every ad slot on every surface. Argument-keyed (position), no auth, no ctx,
  // no write and no field resolver on PublicAd; an approved ad reaches the slots
  // within the TTL of its start time.
  'activeAds',
  // Asked on every page load of every website. Argument-keyed (site), no auth,
  // no ctx, returns a bare string; a Tech → Google Analytics edit reaches the
  // websites within the TTL.
  'googleAnalyticsTag',
  // A venue's food rating on its menu and every dish page. Argument-keyed
  // (venue_id), no auth, no ctx, one aggregate; a new rating shows within the TTL.
  // Its documents ask for nothing else, so the whole response is cacheable.
  'venueFoodRating',
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
 * `myPodDrafts` was cut too: invalidation is TTL-only, so for a minute after a
 * delete or a publish the host's own refetch was served the old list, the
 * deleted draft came back, and deleting it again found nothing. A list its
 * owner edits and re-reads in the same breath must read live.
 */
const PERSONAL_CACHEABLE_FIELDS = new Set([
  'myPodIdeas',
  'myAddresses',
]);

/** CMS render fields: cached, but keyed by the CMS epoch so any CMS write retires every entry at once. */
const CMS_EPOCH_FIELDS = new Set(['cmsRender', 'cmsSitemap', 'cmsErrorPage']);
const CMS_EPOCH_KEY = 'cms:epoch';

/** Called after every Website CMS write: the next render of every CMS page reads fresh. */
export async function bumpCmsEpoch(): Promise<void> {
  await cacheIncr(CMS_EPOCH_KEY);
}

const selectsCms = (operation: OperationDefinitionNode | undefined) =>
  operation?.selectionSet.selections.some((s) => s.kind === Kind.FIELD && CMS_EPOCH_FIELDS.has(s.name.value)) ?? false;

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

/**
 * Whitelisted fields whose answer is wider for a staff console than for
 * everybody else: `clubs` lists hidden clubs there and nowhere else.
 *
 * The shared entry must only ever hold the member answer, so a console request
 * selecting one of these neither reads nor writes the cache — it is a handful
 * of staff page loads against a key every app session shares. Anyone else,
 * signed in or not, still gets and fills the one public entry.
 */
const CONSOLE_VARIANT_FIELDS = new Set(['clubs']);

const selectsConsoleVariant = (operation: OperationDefinitionNode | undefined) =>
  operation?.selectionSet.selections.some(
    (s) => s.kind === Kind.FIELD && CONSOLE_VARIANT_FIELDS.has(s.name.value)
  ) ?? false;

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
        if (contextValue.noRedis || (selectsConsoleVariant(ctx.operation) && canSeeHidden(contextValue))) {
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
        const epoch = selectsCms(ctx.operation) ? `cms${(await cacheGet<number>(CMS_EPOCH_KEY)) ?? 0}:` : '';
        const key = epoch + cacheKey(scope, identity, ctx.request.query, ctx.request.variables, ctx.request.operationName);
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
