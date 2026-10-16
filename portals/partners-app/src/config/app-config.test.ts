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

/** The Options pages a nav links to, at any depth. */
const optionsRoutes = (items: readonly AppNavItem[]) => routes(items).filter((to) => to.endsWith('/options'));
const childRoutes = (item: AppNavItem | undefined) => (item?.children ?? []).map((child) => child.to);

/** The Venue Options group's routes, in order, without the flag-owned Auto Pods. */
const VENUE_OPTION_ROUTES = [
  '/venues/options',
  '/venues/dashboard',
  '/register-venue',
  '/venues/requests',
  '/venues/availability',
  '/venues/settings',
  '/venues/earnings',
  '/venues/publish',
  '/venues/rented-items',
  '/venues/pods',
  '/venues/change-requests',
  '/venues/pod-requests',
  '/venues/event-requests',
  '/venues/nearby-hosts',
  '/verification',
  '/wallet',
];

describe('buildNav', () => {
  it('shows ONE highlighted Options entry for the studio, then the account tail', () => {
    const nav = buildNav(['HOST']);
    expect(nav).toHaveLength(1 + tail.length);
    expect(nav[0]).toEqual({
      label: 'mweb.studioOptions.hostEntry',
      labelKey: 'mweb.studioOptions.hostEntry',
      caption: 'mweb.studioOptions.hostEntryHint',
      captionKey: 'mweb.studioOptions.hostEntryHint',
      to: '/host/options',
      icon: 'work',
      featured: true,
    });
    expect(labels(nav.slice(1))).toEqual(tail);
  });

  it('gives the Venue Studio two groups — Venue Options and Food — then the account tail', () => {
    const nav = buildNav(['VENUE_OWNER']);
    expect(nav).toHaveLength(2 + tail.length);
    const [venue, food] = nav;
    // A group header is not a link: its children are.
    expect(venue).toMatchObject({ labelKey: 'mweb.studioOptions.venueEntry', icon: 'storefront' });
    expect(venue.to).toBeUndefined();
    expect(venue.featured).toBeUndefined();
    expect(food).toMatchObject({ label: 'Food', labelKey: 'shell.nav.food' });
    expect(food.to).toBeUndefined();
    expect(labels(nav.slice(2))).toEqual(tail);
  });

  it('opens the Venue Options group with All options, then every venue option outside the food desk', () => {
    const [venue] = buildNav(['VENUE_OWNER']);
    expect(childRoutes(venue)).toEqual(VENUE_OPTION_ROUTES);
    expect(venue.children?.[0]).toEqual({
      label: 'All options',
      labelKey: 'shell.nav.allOptions',
      to: '/venues/options',
      icon: 'widgets',
    });
    expect(venue.children?.slice(1, 3).map((child) => child.labelKey)).toEqual([
      'mweb.studioOptions.dashboard',
      'mweb.studioOptions.yourVenues',
    ]);
  });

  it('lists the food desk under Food: Dashboard, Menu, Food Orders, Food Coupons', () => {
    const [venue, food] = buildNav(['VENUE_OWNER']);
    expect(childRoutes(food)).toEqual([
      '/venues/food-dashboard',
      '/venues/food-menu',
      '/venues/food-orders',
      '/venues/food-coupons',
    ]);
    expect(food.children?.map((child) => child.labelKey)).toEqual([
      // "Food" is the group's own name, so these two read plainly under it.
      'shell.nav.dashboard',
      'shell.nav.foodMenu',
      'mweb.studioOptions.foodOrders',
      'mweb.studioOptions.foodCoupons',
    ]);
    // A food page is in the Food group only.
    expect(childRoutes(venue).filter((to) => to?.startsWith('/venues/food-'))).toEqual([]);
  });

  it('lists Auto Pods in the Venue Options group only while its flag is on', () => {
    expect(routes(buildNav(['VENUE_OWNER']))).not.toContain('/venues/auto-pods');
    expect(routes(buildNav(['VENUE_OWNER'], { autoPods: false }))).not.toContain('/venues/auto-pods');
    const [venue, food] = buildNav(['VENUE_OWNER'], { autoPods: true });
    // In catalogue order: after Slot Requests, before Availability.
    expect(childRoutes(venue)).toEqual([
      ...VENUE_OPTION_ROUTES.slice(0, 4),
      '/venues/auto-pods',
      ...VENUE_OPTION_ROUTES.slice(4),
    ]);
    expect(childRoutes(food)).not.toContain('/venues/auto-pods');
  });

  it('keeps every row of a group unique by label and by route, and gives each an icon', () => {
    for (const group of buildNav(['VENUE_OWNER'], { autoPods: true }).slice(0, 2)) {
      const children = group.children ?? [];
      expect(new Set(children.map((child) => child.label)).size).toBe(children.length);
      expect(new Set(children.map((child) => child.to)).size).toBe(children.length);
      for (const child of children) expect(child.icon).toEqual(expect.any(String));
    }
  });

  it('links exactly one Options page per nav, whichever studio is open', () => {
    for (const role of ['VENUE_OWNER', 'HOST', 'CLUB_ADMIN', 'ECOMM_MANAGER'] as const) {
      expect(optionsRoutes(buildNav([role], { products: true, autoPods: true }))).toEqual([OPTIONS[role]]);
    }
  });

  it.each([
    ['HOST', 'mweb.studioOptions.hostEntry', 'mweb.studioOptions.hostEntryHint'],
    ['CLUB_ADMIN', 'mweb.studioOptions.clubEntry', 'mweb.studioOptions.clubEntryHint'],
    ['ECOMM_MANAGER', 'mweb.studioOptions.brandEntry', 'mweb.studioOptions.brandEntryHint'],
  ] as const)('gives the %s studio its own Options entry, label and hint', (role, labelKey, captionKey) => {
    const [entry] = buildNav([role], { products: true });
    expect(entry).toMatchObject({ labelKey, captionKey, to: OPTIONS[role], featured: true });
  });

  it('does not list the other studios’ options one by one in the sidebar', () => {
    const host = routes(buildNav(['HOST'], { autoPods: true }));
    for (const to of ['/host/dashboard', '/host/pods', '/host/auto-pods', '/host/publish', '/wallet']) {
      expect(host).not.toContain(to);
    }
    const brand = routes(buildNav(['ECOMM_MANAGER'], { products: true }));
    for (const to of ['/ecomm/dashboard', '/ecomm-brand', '/ecomm-brand/orders', '/wallet']) {
      expect(brand).not.toContain(to);
    }
  });

  it('does not list Verification in the sidebar outside a studio that lists its own options', () => {
    const navs = [buildNav([]), buildNav(['HOST']), buildNav(['ECOMM_MANAGER'], { products: true })];
    for (const nav of navs) {
      expect(routes(nav)).not.toContain('/verification');
      expect(labels(nav)).not.toContain('Verification');
    }
  });

  it('shows the active studio, and falls back to the first one held', () => {
    const roles = ['HOST', 'VENUE_OWNER'];
    expect(buildNav(roles, { activeRole: 'HOST' })[0].to).toBe('/host/options');
    expect(optionsRoutes(buildNav(roles, { activeRole: 'VENUE_OWNER' }))).toEqual(['/venues/options']);
    // Not held → the first studio held (catalogue order: Venue before Host).
    expect(optionsRoutes(buildNav(roles, { activeRole: 'CLUB_ADMIN' }))).toEqual(['/venues/options']);
    expect(optionsRoutes(buildNav(roles))).toEqual(['/venues/options']);
    // Never two studios at once.
    const nav = routes(buildNav(roles, { activeRole: 'HOST' }));
    expect(nav).not.toContain('/venues/options');
    expect(nav).not.toContain('/venues/food-orders');
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

  it('lands somebody holding several studios on the one they are in, else the first in sidebar order', () => {
    const roles = ['HOST', 'CLUB_ADMIN', 'ECOMM_MANAGER'];
    // "Home" (breadcrumb root, logo) reopens the studio the partner is in.
    expect(landingPath(roles, true, 'ECOMM_MANAGER')).toBe('/ecomm/options');
    expect(landingPath(roles, true, 'HOST')).toBe('/host/options');
    // No studio remembered yet → the first one held.
    expect(landingPath(roles)).toBe('/club-admin/options');
    expect(landingPath(roles, true, null)).toBe('/club-admin/options');
    // A remembered studio they do not hold, or one the product flag hides.
    expect(landingPath(roles, true, 'VENUE_OWNER')).toBe('/club-admin/options');
    expect(landingPath(roles, false, 'ECOMM_MANAGER')).toBe('/club-admin/options');
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
