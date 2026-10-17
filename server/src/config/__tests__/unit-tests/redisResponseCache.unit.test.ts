/**
 * The whole-response cache for `venueFoodRating`: a venue's food rating is the
 * same for every caller, so a query asking only for it is served from and
 * written to the shared (public) entry — and a query that also asks for
 * anything not whitelisted is never cached at all.
 */
jest.mock('@config/redis', () => ({
  redisAvailable: jest.fn(() => true),
  cacheGet: jest.fn(async () => null),
  cacheSet: jest.fn(async () => undefined),
  cacheIncr: jest.fn(async () => 1),
}));

import { HeaderMap } from '@apollo/server';
import { Kind, parse } from 'graphql';
import { cacheGet, cacheSet, redisAvailable } from '@config/redis';
import { redisResponseCachePlugin } from '@config/redisResponseCache';
import { makeContext } from '@test/harness';

const get = cacheGet as jest.Mock;
const set = cacheSet as jest.Mock;
const available = redisAvailable as jest.Mock;

const RATING_QUERY = 'query Rating($id: ID!) { venueFoodRating(venue_id: $id) { average count } }';

const operationOf = (query: string) => {
  const definition = parse(query).definitions[0];
  if (definition?.kind !== Kind.OPERATION_DEFINITION) throw new Error('not an operation');
  return definition;
};

/** The slice of Apollo's request context the plugin reads. */
const requestContext = (query: string, user: Parameters<typeof makeContext>[0] = null) => ({
  operation: operationOf(query),
  contextValue: makeContext(user),
  request: { query, variables: { id: 'venue-1' }, operationName: 'Rating' },
  response: {
    http: { headers: new HeaderMap() },
    body: { kind: 'single' as const, singleResult: { data: { venueFoodRating: { average: 4.5, count: 12 } } } },
  },
});

/** The plugin's two hooks for one request. */
async function listen(ctx: ReturnType<typeof requestContext>) {
  const hooks = await redisResponseCachePlugin.requestDidStart?.(ctx as never);
  if (!hooks?.responseForOperation || !hooks.willSendResponse) throw new Error('the cache plugin lost a hook');
  return { responseForOperation: hooks.responseForOperation, willSendResponse: hooks.willSendResponse };
}

async function run(query: string, user: Parameters<typeof makeContext>[0] = null) {
  const ctx = requestContext(query, user);
  const hooks = await listen(ctx);
  const served = await hooks.responseForOperation(ctx as never);
  await hooks.willSendResponse(ctx as never);
  return { ctx, served };
}

beforeEach(() => {
  available.mockReturnValue(true);
  get.mockResolvedValue(null);
});

describe('venueFoodRating in the response cache', () => {
  it('a miss reads the shared public entry, lets the resolver run, then stores its answer', async () => {
    const { ctx, served } = await run(RATING_QUERY);

    expect(served).toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
    const [key] = get.mock.calls[0] as [string];
    expect(key).toMatch(/^gql:pub:[0-9a-f]{64}$/);
    expect(set).toHaveBeenCalledWith(key, { venueFoodRating: { average: 4.5, count: 12 } }, expect.any(Number));
    expect(ctx.response.http.headers.get('x-redis-cache')).toBe('miss');
  });

  it('a hit answers from the cache, and a signed-in caller shares the anonymous entry', async () => {
    const cached = { venueFoodRating: { average: 3, count: 2 } };
    get.mockResolvedValue(cached);

    const anonymous = await run(RATING_QUERY);
    const member = await run(RATING_QUERY, { id: '65b000000000000000000007', roles: ['USER'] });

    expect(anonymous.served).toMatchObject({ body: { kind: 'single', singleResult: { data: cached } } });
    expect(member.served).toMatchObject({ body: { kind: 'single', singleResult: { data: cached } } });
    expect(get.mock.calls[0]?.[0]).toBe(get.mock.calls[1]?.[0]);
    expect(set).not.toHaveBeenCalled();
    expect(member.ctx.response.http.headers.get('x-redis-cache')).toBe('hit');
  });

  it('is keyed by its arguments: another venue is another entry', async () => {
    await run(RATING_QUERY);
    const other = requestContext(RATING_QUERY);
    other.request.variables = { id: 'venue-2' };
    await (await listen(other)).responseForOperation(other as never);

    expect(get.mock.calls[0]?.[0]).not.toBe(get.mock.calls[1]?.[0]);
  });

  it('never caches a document that also asks for a field off the whitelist', async () => {
    const { served, ctx } = await run(
      'query Rating($id: ID!) { venueFoodRating(venue_id: $id) { average } venueFoodOrders { id } }'
    );

    expect(served).toBeNull();
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
    expect(ctx.response.http.headers.get('x-redis-cache')).toBeUndefined();
  });

  // A host deletes a draft and re-reads the list at once: a cached list
  // brought the deleted draft back and its second delete found nothing.
  it("never caches a host's drafts list, even signed in", async () => {
    const { served, ctx } = await run('query MyPodDrafts { myPodDrafts { id step } }', {
      id: '65b000000000000000000007',
      roles: ['USER'],
    });

    expect(served).toBeNull();
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
    expect(ctx.response.http.headers.get('x-redis-cache')).toBeUndefined();
  });

  it('never caches a mutation, and does nothing while Redis is down', async () => {
    await run('mutation Rate { venueFoodRating(venue_id: "v") { average } }');
    expect(get).not.toHaveBeenCalled();

    available.mockReturnValue(false);
    const { served } = await run(RATING_QUERY);
    expect(served).toBeNull();
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });
});
