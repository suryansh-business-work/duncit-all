import { describe, it, expect, vi } from 'vitest';

// Apollo 4 hands the handler ONE error rather than a networkError/graphQLErrors pair.
type ErrHandler = (arg: { error?: { message: string } | null }) => void;
type AuthFn = (op: unknown, ctx: { headers?: Record<string, string> }) => { headers: Record<string, string> };
type RetryIf = (error: unknown) => boolean;

const cap = vi.hoisted(() => ({
  onErrorCb: null as ErrHandler | null,
  authFn: null as AuthFn | null,
  retryOpts: null as { attempts: { retryIf: RetryIf } } | null,
  httpArgs: null as unknown,
  cacheArgs: null as unknown,
  clientArgs: null as unknown,
  fromArg: null as unknown[] | null,
}));

vi.mock('@apollo/client', () => ({
  ApolloClient: vi.fn(function (args: unknown) {
    cap.clientArgs = args;
    return { __client: true };
  }),
  HttpLink: vi.fn(function (args: unknown) {
    cap.httpArgs = args;
    return { __http: true };
  }),
  InMemoryCache: vi.fn(function (args: unknown) {
    cap.cacheArgs = args;
    return { __cache: true };
  }),
  from: vi.fn((arr: unknown[]) => {
    cap.fromArg = arr;
    return { __from: arr };
  }),
}));
vi.mock('@apollo/client/link/context', () => ({
  setContext: vi.fn((fn: AuthFn) => {
    cap.authFn = fn;
    return { __auth: true };
  }),
}));
vi.mock('@apollo/client/link/error', () => ({
  onError: vi.fn((cb: ErrHandler) => {
    cap.onErrorCb = cb;
    return { __err: true };
  }),
}));
vi.mock('@apollo/client/link/retry', () => ({
  RetryLink: vi.fn(function (opts: { attempts: { retryIf: RetryIf } }) {
    cap.retryOpts = opts;
    return { __retry: true };
  }),
}));
vi.mock('@duncit/user-core', () => ({
  getOrCreateDuid: () => 'DUID-1',
  SURFACE_HEADER: 'x-duncit-surface',
  APP_HEADER: 'x-duncit-app',
  NO_REDIS_HEADER: 'x-no-redis',
  resolveNoRedisFlag: vi.fn(() => false),
}));

import { resolveNoRedisFlag } from '@duncit/user-core';
import { apolloErrorLink, createApolloClient } from '../src/lib/apollo';

describe('apolloErrorLink', () => {
  it('rewrites transport-failure messages to the friendly one', () => {
    const net = { message: 'Failed to fetch' };
    cap.onErrorCb?.({ error: net });
    expect(net.message).toMatch(/Unable to connect to server/);
  });

  it('leaves other network errors alone and tolerates a missing one', () => {
    const net = { message: 'Some GraphQL error' };
    cap.onErrorCb?.({ error: net });
    expect(net.message).toBe('Some GraphQL error');
    expect(() => cap.onErrorCb?.({ error: null })).not.toThrow();
  });
});

describe('createApolloClient', () => {
  it('wires the link chain and default User type policy', () => {
    expect(apolloErrorLink).toBeTruthy();
    const client = createApolloClient({ graphqlUrl: 'https://api.test/graphql', getToken: () => 'tok' });
    expect(client).toEqual({ __client: true });
    expect(cap.httpArgs).toEqual({ uri: 'https://api.test/graphql' });
    expect(cap.fromArg).toEqual([{ __err: true }, { __retry: true }, { __auth: true }, { __http: true }]);
    expect(cap.cacheArgs).toEqual({ typePolicies: { User: { keyFields: ['user_id'] } } });
  });

  it('adds Bearer + x-duid headers when a token is present', () => {
    createApolloClient({ graphqlUrl: 'u', getToken: () => 'tok' });
    const out = cap.authFn?.({}, { headers: { existing: '1' } });
    expect(out?.headers).toEqual({
      existing: '1',
      authorization: 'Bearer tok',
      'x-duid': 'DUID-1',
      'x-duncit-surface': 'PORTAL',
    });
  });

  it('omits the auth header (no token) and the duid header (includeDuid false)', () => {
    createApolloClient({ graphqlUrl: 'u', getToken: () => null, includeDuid: false, typePolicies: { Foo: {} } });
    const out = cap.authFn?.({}, {});
    expect(out?.headers).toEqual({ 'x-duncit-surface': 'PORTAL' });
    expect(cap.cacheArgs).toEqual({ typePolicies: { Foo: {} } });
  });

  it('sends the surface a caller declares (admin) instead of the PORTAL default', () => {
    createApolloClient({ graphqlUrl: 'u', getToken: () => null, includeDuid: false, surface: 'ADMIN_PORTAL' });
    expect(cap.authFn?.({}, {})?.headers).toEqual({ 'x-duncit-surface': 'ADMIN_PORTAL' });
  });

  it('sends the console key as x-duncit-app when the caller declares one', () => {
    createApolloClient({ graphqlUrl: 'u', getToken: () => null, includeDuid: false, app: 'crm' });
    expect(cap.authFn?.({}, {})?.headers).toEqual({
      'x-duncit-surface': 'PORTAL',
      'x-duncit-app': 'crm',
    });
  });

  it('sends x-no-redis when the tab has the ?noRedis flag set', () => {
    vi.mocked(resolveNoRedisFlag).mockReturnValueOnce(true);
    createApolloClient({ graphqlUrl: 'u', getToken: () => null, includeDuid: false });
    expect(cap.authFn?.({}, {})?.headers).toEqual({
      'x-duncit-surface': 'PORTAL',
      'x-no-redis': 'true',
    });
  });

  describe('retryIf', () => {
    const retryIf = () => cap.retryOpts?.attempts.retryIf as RetryIf;

    it('never retries a falsy error', () => {
      createApolloClient({ graphqlUrl: 'u', getToken: () => null });
      expect(retryIf()(null)).toBe(false);
    });

    it('retries 5xx and status-0 transport failures', () => {
      createApolloClient({ graphqlUrl: 'u', getToken: () => null });
      const fn = retryIf();
      expect(fn({ statusCode: 500 })).toBe(true);
      expect(fn({ statusCode: 0 })).toBe(true);
    });

    it('does not retry auth failures', () => {
      createApolloClient({ graphqlUrl: 'u', getToken: () => null });
      const fn = retryIf();
      expect(fn({ response: { status: 401 } })).toBe(false);
      expect(fn({ statusCode: 403 })).toBe(false);
    });

    it('retries errors without an HTTP status', () => {
      createApolloClient({ graphqlUrl: 'u', getToken: () => null });
      expect(retryIf()({})).toBe(true);
    });
  });
});
