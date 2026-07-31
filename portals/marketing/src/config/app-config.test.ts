import { describe, expect, it } from 'vitest';
import { appConfig } from './app-config';

describe('Duncit Marketing app config', () => {
  it('declares the expected identity', () => {
    expect(appConfig.key).toBe('marketing');
    expect(appConfig.name).toBe('Marketing');
    expect(appConfig.fullName).toBe('Duncit Marketing');
    expect(appConfig.tokenKey).toBe('marketing_token');
  });

  it('gates on the MARKETING_MANAGER role by default', () => {
    expect(appConfig.requiredRoles).toContain('MARKETING_MANAGER');
  });

  it('exposes every nav destination, including the ones nested in a group', () => {
    const targets = appConfig.nav.flatMap((n) => [n.to, ...(n.children ?? []).map((c) => c.to)]);
    expect(targets).toEqual(
      expect.arrayContaining([
        '/',
        '/audience',
        '/campaigns/email',
        '/notifications',
        '/ads-approvals',
        '/live-ads',
        '/ads-settings',
      ]),
    );
  });

  // A group header is not navigable — the sidebar ignores a parent `to`, and
  // giving one would put a dead link in the header search and breadcrumbs.
  it('leaves every group header without a route of its own', () => {
    const groups = appConfig.nav.filter((n) => (n.children ?? []).length > 0);
    expect(groups.map((g) => g.label)).toEqual(['Campaigns', 'Ads']);
    for (const group of groups) {
      expect(group.to).toBeUndefined();
    }
  });
});
