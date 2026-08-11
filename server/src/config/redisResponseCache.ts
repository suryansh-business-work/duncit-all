/**
 * Redis GraphQL response cache (Apollo plugin).
 *
 * Whole-response caching for a WHITELIST of public, user-independent queries
 * (branding, settings, translations, website content, ...). A request is
 * served from Redis only when EVERY top-level field it selects is whitelisted,
 * so a document mixing `me` with `branding` is never cached — whitelisted
 * fields are user-independent by construction, which is what makes sharing one
 * cached response across users (authed or not) safe.
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
import { cacheGet, cacheSet, redisAvailable } from './redis';

/**
 * Public queries whose result depends only on their arguments — never on the
 * caller. Anything user-, stock- or session-shaped stays OFF this list.
 */
const CACHEABLE_FIELDS = new Set([
  'branding',
  'appVersionInfo',
  'publicAppSettings',
  'publicClientConfig',
  'publicFeatureFlags',
  'publicLocales',
  'publicTranslations',
  'publicRoles',
  'publicPolicies',
  'publicWebsiteContent',
  'publicWebsiteNav',
  'publicPodPlans',
  'publicFaqGroups',
  'publicPartnerFaqs',
  'publicFinanceSettings',
  'publicSomethingForYou',
]);

const DEFAULT_TTL_SECONDS = 60;

function ttlSeconds(): number {
  const parsed = Number.parseInt(process.env.REDIS_CACHE_TTL_SECONDS ?? '', 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_TTL_SECONDS;
}

function isCacheableOperation(operation: OperationDefinitionNode | undefined): boolean {
  if (operation?.operation !== 'query') return false;
  return operation.selectionSet.selections.every(
    (selection) => selection.kind === Kind.FIELD && CACHEABLE_FIELDS.has(selection.name.value)
  );
}

type CacheState = 'hit' | 'miss' | 'bypass';

interface CacheAttempt {
  key: string;
  state: CacheState;
}

// Keyed by the per-request context object so nothing widens GraphQLContext.
const attempts = new WeakMap<GraphQLContext, CacheAttempt>();

function cacheKey(
  query: string | undefined,
  variables: unknown,
  operationName: string | null | undefined
): string {
  const hash = createHash('sha256')
    .update(query ?? '')
    .update(JSON.stringify(variables ?? {}))
    .update(operationName ?? '')
    .digest('hex');
  return `gql:${hash}`;
}

export const redisResponseCachePlugin: ApolloServerPlugin<GraphQLContext> = {
  async requestDidStart() {
    return {
      async responseForOperation(ctx) {
        if (!isCacheableOperation(ctx.operation)) return null;
        const { contextValue } = ctx;
        if (contextValue.noRedis) {
          attempts.set(contextValue, { key: '', state: 'bypass' });
          return null;
        }
        if (!redisAvailable()) return null;
        const key = cacheKey(ctx.request.query, ctx.request.variables, ctx.request.operationName);
        const data = await cacheGet<Record<string, unknown>>(key);
        if (data == null) {
          attempts.set(contextValue, { key, state: 'miss' });
          return null;
        }
        attempts.set(contextValue, { key, state: 'hit' });
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
