import { describe, expect, it } from 'vitest';
import type { AppNavItem } from '@duncit/shell';
import { appConfig, buildNav, landingPath } from './app-config';

/** Every route in a nav tree, depth-first — the options a partner can reach. */
const routes = (items: readonly AppNavItem[]): string[] =>
  items.flatMap((item) => [...(item.to ? [item.to] : []), ...routes(item.children ?? [])]);
const labels = (items: readonly AppNavItem[]) => items.map((item) => item.label);
const tail = labels(appConfig.nav);

describe('buildNav', () => {
  it('shows ONE studio: Dashboard, Pods, Requests, Withdrawal, then the account tail', () => {
    const nav = buildNav(['HOST'], { autoPods: true });
    expect(labels(nav)).toEqual(['Dashboard', 'Pods', 'Requests', 'Withdrawal', ...tail]);
    expect(nav[0].to).toBe('/host/dashboard');
    expect(nav.find((i) => i.label === 'Withdrawal')?.to).toBe('/wallet');
  });

  it('keeps every former Host option in the menu, grouped', () => {
    const all = routes(buildNav(['HOST'], { autoPods: true }));
    for (const to of [
      '/host/dashboard',
      '/host/pods',
      '/host/auto-pods',
      '/host/pod-requests',
      '/host/change-requests',
      '/host/nearby-venues',
      '/wallet',
    ]) {
      expect(all).toContain(to);
    }
  });

  it('keeps every former Venue option in the menu, grouped', () => {
    const nav = buildNav(['VENUE_OWNER'], { autoPods: true });
    expect(labels(nav)).toEqual(['Dashboard', 'Venues', 'Pods', 'Requests', 'Withdrawal', ...tail]);
    const all = routes(nav);
    for (const to of [
      '/venues/dashboard',
      '/register-venue',
      '/venues/settings',
      '/venues/pods',
      '/venues/requests',
      '/venues/pod-requests',
      '/venues/change-requests',
      '/venues/auto-pods',
      '/venues/nearby-hosts',
    ]) {
      expect(all).toContain(to);
    }
  });

  it('keeps every former Club Admin option in the menu, grouped', () => {
    const all = routes(buildNav(['CLUB_ADMIN'], { autoPods: true }));
    for (const to of [
      '/club-admin/dashboard',
      '/club-admin/clubs',
      '/club-admin/auto-pods',
      '/club-admin/monitoring',
      '/club-admin/change-requests',
      '/wallet',
    ]) {
      expect(all).toContain(to);
    }
  });

  it('keeps every former Brand option in the menu while products are on', () => {
    const all = routes(buildNav(['ECOMM_MANAGER'], { products: true }));
    for (const to of ['/ecomm/dashboard', '/ecomm-brand', '/ecomm-brand/integrations', '/ecomm-brand/returns', '/wallet']) {
      expect(all).toContain(to);
    }
  });

  it('shows the active studio, and falls back to the first one held', () => {
    const roles = ['HOST', 'VENUE_OWNER'];
    expect(buildNav(roles, { activeRole: 'HOST' })[0].to).toBe('/host/dashboard');
    expect(buildNav(roles, { activeRole: 'VENUE_OWNER' })[0].to).toBe('/venues/dashboard');
    // Not held → the first studio held (catalogue order: Venue before Host).
    expect(buildNav(roles, { activeRole: 'CLUB_ADMIN' })[0].to).toBe('/venues/dashboard');
    expect(buildNav(roles)[0].to).toBe('/venues/dashboard');
    // Never two studios' menus at once.
    expect(routes(buildNav(roles, { activeRole: 'HOST' }))).not.toContain('/register-venue');
  });

  it('leaves the Auto Pods options out while the flag is off', () => {
    const off = routes(buildNav(['HOST', 'VENUE_OWNER', 'CLUB_ADMIN']));
    expect(off.some((to) => to.endsWith('/auto-pods'))).toBe(false);
    for (const role of ['HOST', 'VENUE_OWNER', 'CLUB_ADMIN'] as const) {
      const on = routes(buildNav([role], { autoPods: true, activeRole: role }));
      expect(on.some((to) => to.endsWith('/auto-pods'))).toBe(true);
    }
  });

  it('groups FAQs, Support and Policies under Help', () => {
    const help = buildNav([]).find((i) => i.label === 'Help');
    expect(help?.children?.map((c) => c.to)).toEqual(['/faqs', '/support', '/policies']);
  });

  it('invites a user with no partner role in, and offers nothing they cannot use', () => {
    const nav = buildNav([]);
    expect(labels(nav)).toEqual(['Be a Host', ...tail]);
    expect(nav[0].to).toBe('/be-a-host');
    expect(routes(nav)).not.toContain('/wallet');
    expect(buildNav([], { products: true })[1].to).toBe('/become-a-brand-partner');
  });

  it('never puts the host application form in the sidebar', () => {
    expect(routes(buildNav([]))).not.toContain('/become-host');
    expect(routes(buildNav(['HOST']))).not.toContain('/become-host');
    // An approved host is past the invitation.
    expect(routes(buildNav(['HOST']))).not.toContain('/be-a-host');
  });

  it('handles null / undefined roles as no partner roles', () => {
    expect(routes(buildNav(null))).not.toContain('/wallet');
    expect(routes(buildNav(undefined))).not.toContain('/wallet');
  });

  it('keeps Withdrawal for an e-commerce partner while the shop is switched off', () => {
    const off = buildNav(['ECOMM_MANAGER']);
    expect(routes(off)).not.toContain('/ecomm-brand');
    // Money already earned must stay withdrawable.
    expect(routes(off)).toContain('/wallet');
  });

  it('lands an e-commerce-only partner on Earn while products are off', () => {
    expect(landingPath(['ECOMM_MANAGER'], false)).toBe('/earn');
    expect(landingPath(['ECOMM_MANAGER'], true)).toBe('/ecomm/dashboard');
  });
});
