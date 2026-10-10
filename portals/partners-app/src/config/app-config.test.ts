import { describe, expect, it } from 'vitest';
import type { AppNavItem } from '@duncit/shell';
import { appConfig, buildNav, landingPath } from './app-config';
import { PARTNER_SECTIONS, type PartnerRole } from './partner-sections';

/** Every route in a nav tree, depth-first — the entries a partner can reach. */
const routes = (items: readonly AppNavItem[]): string[] =>
  items.flatMap((item) => [...(item.to ? [item.to] : []), ...routes(item.children ?? [])]);
const labels = (items: readonly AppNavItem[]) => items.map((item) => item.label);
const tail = labels(appConfig.nav);

/** The Options page each studio's ONE sidebar entry opens. */
const OPTIONS: Record<PartnerRole, string> = {
  VENUE_OWNER: '/venues/options',
  HOST: '/host/options',
  CLUB_ADMIN: '/club-admin/options',
  ECOMM_MANAGER: '/ecomm/options',
};

describe('buildNav', () => {
  it('shows ONE highlighted Options entry for the studio, then the account tail', () => {
    const nav = buildNav(['VENUE_OWNER']);
    expect(nav).toHaveLength(1 + tail.length);
    expect(nav[0]).toEqual({
      label: 'mweb.studioOptions.venueEntry',
      labelKey: 'mweb.studioOptions.venueEntry',
      caption: 'mweb.studioOptions.venueEntryHint',
      captionKey: 'mweb.studioOptions.venueEntryHint',
      to: '/venues/options',
      icon: 'storefront',
      featured: true,
    });
    expect(labels(nav.slice(1))).toEqual(tail);
  });

  it.each([
    ['HOST', 'mweb.studioOptions.hostEntry', 'mweb.studioOptions.hostEntryHint'],
    ['CLUB_ADMIN', 'mweb.studioOptions.clubEntry', 'mweb.studioOptions.clubEntryHint'],
    ['ECOMM_MANAGER', 'mweb.studioOptions.brandEntry', 'mweb.studioOptions.brandEntryHint'],
  ] as const)('gives the %s studio its own Options entry, label and hint', (role, labelKey, captionKey) => {
    const [entry] = buildNav([role], { products: true });
    expect(entry).toMatchObject({ labelKey, captionKey, to: OPTIONS[role], featured: true });
  });

  it('no longer lists the studio options one by one in the sidebar', () => {
    const all = routes(buildNav(['VENUE_OWNER']));
    for (const to of ['/venues/dashboard', '/venues/pods', '/venues/requests', '/register-venue', '/wallet']) {
      expect(all).not.toContain(to);
    }
  });

  it('does not list Verification in the sidebar, whoever is signed in', () => {
    const navs = [buildNav([]), buildNav(['HOST']), buildNav(['ECOMM_MANAGER'], { products: true })];
    for (const nav of navs) {
      expect(routes(nav)).not.toContain('/verification');
      expect(labels(nav)).not.toContain('Verification');
    }
  });

  it('shows the active studio, and falls back to the first one held', () => {
    const roles = ['HOST', 'VENUE_OWNER'];
    expect(buildNav(roles, { activeRole: 'HOST' })[0].to).toBe('/host/options');
    expect(buildNav(roles, { activeRole: 'VENUE_OWNER' })[0].to).toBe('/venues/options');
    // Not held → the first studio held (catalogue order: Venue before Host).
    expect(buildNav(roles, { activeRole: 'CLUB_ADMIN' })[0].to).toBe('/venues/options');
    expect(buildNav(roles)[0].to).toBe('/venues/options');
    // Never two studios at once.
    const nav = routes(buildNav(roles, { activeRole: 'HOST' }));
    expect(nav).not.toContain('/venues/options');
    expect(nav.filter((to) => to.endsWith('/options'))).toEqual(['/host/options']);
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
    expect(routes(nav).some((to) => to.endsWith('/options'))).toBe(false);
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
    expect(routes(off)).not.toContain('/ecomm/options');
    // Money already earned must stay withdrawable.
    expect(routes(off)).toContain('/wallet');
  });
});

describe('landingPath', () => {
  it('lands each studio on its Options page', () => {
    for (const section of PARTNER_SECTIONS) {
      expect(landingPath([section.role], true)).toBe(OPTIONS[section.role]);
    }
  });

  it('lands somebody holding several studios on the first one, in sidebar order', () => {
    expect(landingPath(['HOST', 'CLUB_ADMIN'])).toBe('/club-admin/options');
  });

  it('lands an e-commerce-only partner on Earn while products are off', () => {
    expect(landingPath(['ECOMM_MANAGER'], false)).toBe('/earn');
    expect(landingPath(['ECOMM_MANAGER'], true)).toBe('/ecomm/options');
  });

  it('lands somebody with no partner role on Earn', () => {
    expect(landingPath([])).toBe('/earn');
    expect(landingPath(null)).toBe('/earn');
  });
});
