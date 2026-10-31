import { describe, expect, it } from 'vitest';
import type { AppNavItem } from '@duncit/shell';
import { appConfig } from './app-config';
import { MARKETING_NAV, buildNav } from './nav';

/** Every destination in a tree, however deep the groups go. */
const destinations = (items: readonly AppNavItem[]): string[] =>
  items.flatMap((item) => [...(item.to ? [item.to] : []), ...destinations(item.children ?? [])]);

const groups = (items: readonly AppNavItem[]): AppNavItem[] => items.filter((item) => (item.children ?? []).length > 0);

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

  it('wears the brand red as its accent', () => {
    expect(appConfig.accent).toMatchObject({ main: '#f82c2e' });
  });

  it('ships the manager sidebar as its nav', () => {
    expect(appConfig.nav).toEqual([...MARKETING_NAV]);
  });
});

describe('Marketing sidebar', () => {
  it('reaches every page, under the section that owns it', () => {
    expect(destinations(MARKETING_NAV)).toEqual([
      '/',
      '/social/accounts',
      '/publish/calendar',
      '/leads/instagram',
      '/campaigns/email',
      '/audience',
      '/notifications',
      '/app-popups',
      '/status',
      '/campaigns/mail-preferences',
      '/occasions',
      '/coupons',
      '/short-links',
      '/external-links',
      '/ads-approvals',
      '/live-ads',
      '/ads-settings',
      '/analytics/contacts',
      '/settings/integrations',
    ]);
  });

  it('names every entry by a shared catalogue key, so the shell renders the translated label', () => {
    const walk = (items: readonly AppNavItem[]): void => {
      for (const item of items) {
        expect(item.labelKey).toMatch(/^shell\.nav\.[a-zA-Z]+$/);
        expect(item.label).toBe(item.labelKey);
        walk(item.children ?? []);
      }
    };
    walk(MARKETING_NAV);
  });

  // A group header is not navigable — the sidebar ignores a parent `to`, and
  // giving one would put a dead link in the header search and breadcrumbs.
  it('leaves every group header without a route of its own', () => {
    const headers = [...groups(MARKETING_NAV), ...groups(MARKETING_NAV.flatMap((item) => item.children ?? []))];
    expect(headers.map((g) => g.labelKey)).toEqual([
      'shell.nav.socialMedia',
      'shell.nav.publishing',
      'shell.nav.leads',
      'shell.nav.campaigns',
      'shell.nav.analytics',
      'shell.nav.settings',
      'shell.nav.ads',
    ]);
    for (const header of headers) expect(header.to).toBeUndefined();
  });

  it('shows Settings to a marketing manager or super admin and to nobody else', () => {
    const settings = MARKETING_NAV.find((item) => item.labelKey === 'shell.nav.settings');
    expect(buildNav(['MARKETING_MANAGER'])).toContain(settings);
    expect(buildNav(['SUPER_ADMIN', 'USER'])).toContain(settings);
    expect(buildNav(['MARKETING_READER'])).not.toContain(settings);
    expect(buildNav([])).toHaveLength(MARKETING_NAV.length - 1);
  });
});
