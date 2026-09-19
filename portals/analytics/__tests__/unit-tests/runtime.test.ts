import { describe, expect, it, vi } from 'vitest';
import { resolvePortalGraphqlUrl, type AppConfig } from '@duncit/shell';
import { graphqlUrl, runtime } from '../../src/runtime';
import { appConfig } from '../../src/config/app-config';

const created = vi.hoisted(() => ({ calls: [] as Array<[AppConfig, string]> }));

vi.mock('@duncit/shell', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/shell')>();
  return {
    ...actual,
    createPortalRuntime: (config: AppConfig, url: string) => {
      created.calls.push([config, url]);
      return actual.createPortalRuntime(config, url);
    },
  };
});

describe('analytics runtime', () => {
  it('reads its API from the build environment, like every shell console', () => {
    expect(graphqlUrl).toBe(resolvePortalGraphqlUrl(import.meta.env));
  });

  it('builds the console once, from its own config and that API', () => {
    expect(created.calls).toEqual([[appConfig, graphqlUrl]]);
    expect(runtime.apolloClient).toBeDefined();
    expect(typeof runtime.AppShell).toBe('function');
    expect(typeof runtime.LoginPage).toBe('function');
  });

  it('keeps the session under this console’s own token key', () => {
    localStorage.setItem('analytics_token', 'fixture-session');
    expect(runtime.session.getToken()).toBe('fixture-session');
  });
});
