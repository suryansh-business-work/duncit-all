import { describe, it, expect, vi } from 'vitest';

type ErrHandler = (arg: { networkError?: { message: string } | null }) => void;
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
  ApolloClient: vi.fn((args: unknown) => {
    cap.clientArgs = args;
    return { __client: true };
  }),
  HttpLink: vi.fn((args: unknown) => {
    cap.httpArgs = args;
    return { __http: true };
  }),
  InMemoryCache: vi.fn((args: unknown) => {
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
  RetryLink: vi.fn((opts: { attempts: { retryIf: RetryIf } }) => {
    cap.retryOpts = opts;
    return { __retry: true };
  }),
}));
vi.mock('@duncit/utils', () => ({ getOrCreateDuid: () => 'DUID-1' }));

import { apolloErrorLink, createApolloClient } from '../src/lib/apollo';

describe('apolloErrorLink', () => {
  it('rewrites transport-failure messages to the friendly one', () => {
    const net = { message: 'Failed to fetch' };
    cap.onErrorCb?.({ networkError: net });
    expect(net.message).toMatch(/Unable to connect to server/);
  });

  it('leaves other network errors alone and tolerates a missing one', () => {
    const net = { message: 'Some GraphQL error' };
    cap.onErrorCb?.({ networkError: net });
    expect(net.message).toBe('Some GraphQL error');
    expect(() => cap.onErrorCb?.({ networkError: null })).not.toThrow();
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
    expect(out?.headers).toEqual({ existing: '1', authorization: 'Bearer tok', 'x-duid': 'DUID-1' });
  });

  it('omits the auth header (no token) and the duid header (includeDuid false)', () => {
    createApolloClient({ graphqlUrl: 'u', getToken: () => null, includeDuid: false, typePolicies: { Foo: {} } });
    const out = cap.authFn?.({}, {});
    expect(out?.headers).toEqual({});
    expect(cap.cacheArgs).toEqual({ typePolicies: { Foo: {} } });
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
