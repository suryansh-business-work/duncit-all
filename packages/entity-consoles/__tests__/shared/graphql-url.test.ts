import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveGraphqlUrl } from '../../src/shared/graphql-url';

/**
 * Where a console talks to: localhost under `vite dev`, the production server in
 * a build, and `VITE_GRAPHQL_URL` over both (the Cypress e2e build's override).
 */
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveGraphqlUrl', () => {
  it('prefers VITE_GRAPHQL_URL over both fallbacks', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_GRAPHQL_URL', 'https://staging.server.duncit.com/graphql');
    expect(resolveGraphqlUrl()).toBe('https://staging.server.duncit.com/graphql');
  });

  it('talks to the local server under vite dev', () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_GRAPHQL_URL', undefined);
    expect(resolveGraphqlUrl()).toBe('http://localhost:2001/graphql');
  });

  it('talks to production in a build', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_GRAPHQL_URL', undefined);
    expect(resolveGraphqlUrl()).toBe('https://server.duncit.com/graphql');
  });

  it('treats an empty override as unset', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_GRAPHQL_URL', '');
    expect(resolveGraphqlUrl()).toBe('https://server.duncit.com/graphql');
  });
});
