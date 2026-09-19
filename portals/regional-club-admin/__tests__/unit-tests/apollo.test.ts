import { describe, expect, it, vi } from 'vitest';
import type { CreateApolloClientOptions } from '@duncit/shell';
import { apolloClient } from '../../src/apollo';
import { urlConfigs } from '../../src/config/url-configs';
import { getToken } from '../../src/lib/session';

const created = vi.hoisted(() => ({ options: null as Readonly<CreateApolloClientOptions> | null }));

vi.mock('@duncit/shell', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/shell')>();
  return {
    ...actual,
    createApolloClient: (options: Readonly<CreateApolloClientOptions>) => {
      created.options = options;
      return actual.createApolloClient(options);
    },
  };
});

describe('apolloClient', () => {
  it('is built against this console’s API, session token and rate-limit name', () => {
    expect(apolloClient).toBeDefined();
    expect(created.options?.graphqlUrl).toBe(urlConfigs.graphqlUrl);
    expect(created.options?.getToken).toBe(getToken);
    // The platform rate limiter gives each console its own ceiling by this name.
    expect(created.options?.app).toBe('regional-club-admin');
  });
});
