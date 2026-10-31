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
    expect(appConfig.requiredRoles).toContain('MARKETING_EDITOR');
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
      '/tasks',
      '/approvals',
      '/activity',
      '/social/accounts',
      '/social/inbox',
      '/publish/calendar',
      '/studio/reels',
      '/leads',
      '/leads/instagram',
      '/outreach/sequences',
      '/automation/agents',
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
      '/analytics/overview',
      '/analytics/social',
      '/analytics/content',
      '/analytics/funnel',
      '/analytics/automation',
      '/analytics/contacts',
      '/settings/integrations',
    ]);
  });

  it('puts Create — the reel studio — right after Publishing, as a section of its own', () => {
    expect(MARKETING_NAV[2].labelKey).toBe('shell.nav.publishing');
    const create = MARKETING_NAV[3];
    expect(create.labelKey).toBe('shell.nav.create');
    expect(create.icon).toBe('movie');
    expect(create.children).toEqual([
      { label: 'shell.nav.reelStudio', labelKey: 'shell.nav.reelStudio', to: '/studio/reels', icon: 'movie' },
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
      'shell.nav.overview',
      'shell.nav.socialMedia',
      'shell.nav.publishing',
      'shell.nav.create',
      'shell.nav.leads',
      'shell.nav.outreach',
      'shell.nav.automation',
      'shell.nav.campaigns',
      'shell.nav.analytics',
      'shell.nav.settings',
      'shell.nav.ads',
    ]);
    for (const header of headers) expect(header.to).toBeUndefined();
  });

  it('puts Outreach — the sequences — right after Leads, open to every seat', () => {
    const outreach = MARKETING_NAV[5];
    expect(MARKETING_NAV[4].labelKey).toBe('shell.nav.leads');
    expect(outreach.labelKey).toBe('shell.nav.outreach');
    expect(outreach.icon).toBe('forum');
    expect(outreach.children).toEqual([
      { label: 'shell.nav.sequences', labelKey: 'shell.nav.sequences', to: '/outreach/sequences', icon: 'forum' },
    ]);
    // An editor reaches the page too; what they may do there is gated on the page and the server.
    expect(buildNav(['MARKETING_EDITOR'])).toContain(outreach);
  });

  it('puts Automation — the agents — right after Outreach, on the AI icon', () => {
    const automation = MARKETING_NAV[6];
    expect(MARKETING_NAV[5].labelKey).toBe('shell.nav.outreach');
    expect(automation.labelKey).toBe('shell.nav.automation');
    expect(automation.icon).toBe('ai');
    expect(automation.children).toEqual([{ label: 'shell.nav.agents', labelKey: 'shell.nav.agents', to: '/automation/agents', icon: 'ai' }]);
    // Everyone with a seat reaches the page; the page itself goes read-only for an editor.
    expect(buildNav(['MARKETING_EDITOR'])).toContain(automation);
  });

  it('shows Settings to a marketing manager or super admin and to nobody else', () => {
    const settings = MARKETING_NAV.find((item) => item.labelKey === 'shell.nav.settings');
    expect(buildNav(['MARKETING_MANAGER'])).toContain(settings);
    expect(buildNav(['SUPER_ADMIN', 'USER'])).toContain(settings);
    expect(buildNav(['MARKETING_READER'])).not.toContain(settings);
    expect(buildNav([])).toHaveLength(MARKETING_NAV.length - 1);
  });

  it('leaves Approvals out for an editor, whose sends wait on a manager, and keeps the rest of Overview', () => {
    const overviewOf = (nav: ReadonlyArray<ReturnType<typeof buildNav>[number]>) => nav.find((item) => item.labelKey === 'shell.nav.overview');
    const editorLeaves = overviewOf(buildNav(['MARKETING_EDITOR']))?.children?.map((child) => child.to);
    expect(editorLeaves).toEqual(['/', '/tasks', '/activity']);
    expect(overviewOf(buildNav(['MARKETING_MANAGER']))?.children?.map((child) => child.to)).toContain('/approvals');
    // The shared list itself is never trimmed.
    expect(overviewOf(MARKETING_NAV)?.children?.map((child) => child.to)).toContain('/approvals');
  });
});
