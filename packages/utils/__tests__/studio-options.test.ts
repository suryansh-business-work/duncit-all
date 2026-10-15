import { describe, expect, it } from 'vitest';
import {
  STUDIO_OPTIONS_ENTRY,
  STUDIO_OPTION_LIST,
  studioOptionGroups,
  studioOptionsEntryFor,
  studioOptionsFor,
} from '../src/studio-options';
import { podsByPhase, VENUE_POD_PHASES, venuePodPhase } from '../src/venue-pods';

const EVERY_ROLE = ['HOST', 'VENUE_OWNER', 'CLUB_ADMIN', 'ECOMM_MANAGER'];
const keys = (mode: keyof typeof STUDIO_OPTION_LIST) => STUDIO_OPTION_LIST[mode].map((option) => option.key);

describe('STUDIO_OPTION_LIST', () => {
  it('lists the Venue options in the agreed order', () => {
    expect(keys('VENUE')).toEqual([
      'dashboard',
      'venues',
      'slot-requests',
      'auto-pods',
      'availability',
      'settings',
      'earnings',
      'publish',
      'food-dashboard',
      'food-menu',
      'food-orders',
      'food-coupons',
      'pods',
      'change-requests',
      'pod-requests',
      'event-requests',
      'nearby',
      'verification',
      'withdrawal',
    ]);
  });

  it('gives every studio Dashboard first and Verification, Withdrawal last', () => {
    for (const mode of ['VENUE', 'HOST', 'CLUB', 'ECOMM'] as const) {
      const list = keys(mode);
      expect(list[0]).toBe('dashboard');
      expect(list.slice(-2)).toEqual(['verification', 'withdrawal']);
    }
  });

  it('gives every option a title, a hint and a Partner console path', () => {
    for (const list of Object.values(STUDIO_OPTION_LIST)) {
      for (const option of list) {
        expect(option.labelKey).toMatch(/^mweb\.studioOptions\./);
        expect(option.hintKey).toMatch(/^mweb\.studioOptions\..+Hint$/);
        expect(option.portal.startsWith('/')).toBe(true);
      }
    }
  });

  it('gives an in-app option both an mWeb path and a native route, or neither', () => {
    for (const list of Object.values(STUDIO_OPTION_LIST)) {
      for (const option of list) {
        expect(Boolean(option.path)).toBe(Boolean(option.route));
      }
    }
  });

  it('opens the brand catalogue, integrations, returns and deletion refunds in the Partner console', () => {
    const portalOnly = STUDIO_OPTION_LIST.ECOMM.filter((option) => !option.path).map((option) => option.portal);
    expect(portalOnly).toEqual(['/ecomm-brand', '/ecomm-brand/integrations', '/ecomm-brand/returns', '/ecomm-brand/deletion-refunds']);
  });

  it('opens Event Requests in the Partner console for both a venue and a host, each with its own hint', () => {
    const eventRequests = (mode: 'VENUE' | 'HOST') => STUDIO_OPTION_LIST[mode].find((option) => option.key === 'event-requests');
    expect(eventRequests('VENUE')).toMatchObject({
      labelKey: 'mweb.studioOptions.eventRequests',
      hintKey: 'mweb.studioOptions.venueEventRequestsHint',
      portal: '/venues/event-requests',
    });
    expect(eventRequests('HOST')).toMatchObject({
      labelKey: 'mweb.studioOptions.eventRequests',
      hintKey: 'mweb.studioOptions.hostEventRequestsHint',
      portal: '/host/event-requests',
    });
    for (const mode of ['VENUE', 'HOST'] as const) {
      expect(eventRequests(mode)?.path).toBeUndefined();
      expect(eventRequests(mode)?.route).toBeUndefined();
    }
    // Members never ask a club or a brand for an event.
    expect(STUDIO_OPTION_LIST.CLUB.some((option) => option.key === 'event-requests')).toBe(false);
    expect(STUDIO_OPTION_LIST.ECOMM.some((option) => option.key === 'event-requests')).toBe(false);
  });

  it('lets a brand work its orders and ShipRocket warehouses in the app as well as the console', () => {
    const inApp = STUDIO_OPTION_LIST.ECOMM.filter((option) => ['orders', 'warehouses'].includes(option.key));
    expect(inApp.map(({ path, route, portal }) => ({ path, route, portal }))).toEqual([
      { path: '/products/orders', route: 'BrandOrders', portal: '/ecomm-brand/orders' },
      { path: '/products/warehouses', route: 'BrandWarehouses', portal: '/ecomm-brand/warehouses' },
    ]);
  });
});

describe('studioOptionsEntryFor', () => {
  it('is the studio’s highlighted entry while the user holds it', () => {
    expect(studioOptionsEntryFor('VENUE', ['VENUE_OWNER'])).toBe(STUDIO_OPTIONS_ENTRY.VENUE);
    expect(studioOptionsEntryFor('VENUE', ['VENUE_OWNER'])).toMatchObject({
      path: '/venues/options',
      route: 'VenueOptions',
      portal: '/venues/options',
    });
  });

  it('is null in User mode and once the studio role is revoked', () => {
    expect(studioOptionsEntryFor('USER', EVERY_ROLE)).toBeNull();
    expect(studioOptionsEntryFor('CLUB', ['HOST'])).toBeNull();
  });
});

describe('studioOptionsFor', () => {
  it('keeps Auto Pods only while the flag is on', () => {
    expect(studioOptionsFor('HOST', ['HOST'], { autoPods: true }).map((o) => o.key)).toContain('auto-pods');
    const off = studioOptionsFor('HOST', ['HOST'], { autoPods: false }).map((o) => o.key);
    expect(off).not.toContain('auto-pods');
    expect(off).toContain('create');
  });

  it('lists Host Share and Your Categories in the apps but leaves them out of the Partner console', () => {
    const inApp = studioOptionsFor('HOST', ['HOST'], { autoPods: true }).map((o) => o.key);
    expect(inApp).toEqual(expect.arrayContaining(['share', 'categories']));
    const consoleKeys = studioOptionsFor('HOST', ['HOST'], { autoPods: true, console: true }).map((o) => o.key);
    expect(consoleKeys).not.toContain('share');
    expect(consoleKeys).not.toContain('categories');
    // Only the app-only screens go — every other host option stays in the console.
    expect(consoleKeys).toEqual(inApp.filter((key) => key !== 'share' && key !== 'categories'));
    // The flag still applies on top of the console filter.
    expect(studioOptionsFor('HOST', ['HOST'], { autoPods: false, console: true }).map((o) => o.key)).not.toContain('auto-pods');
  });

  it('gives each app-only option the same mWeb path and native route the apps open', () => {
    const appOnly = STUDIO_OPTION_LIST.HOST.filter((option) => option.appOnly);
    expect(appOnly.map(({ key, path, route }) => ({ key, path, route }))).toEqual([
      { key: 'share', path: '/host/share', route: 'HostShare' },
      { key: 'categories', path: '/host/categories', route: 'HostCategories' },
    ]);
  });

  it('is empty in User mode and for a studio the user does not hold', () => {
    expect(studioOptionsFor('USER', EVERY_ROLE, { autoPods: true })).toEqual([]);
    expect(studioOptionsFor('ECOMM', ['HOST'], { autoPods: true })).toEqual([]);
  });
});

describe('the food group', () => {
  const FOOD_KEYS = ['food-dashboard', 'food-menu', 'food-orders', 'food-coupons'];

  it('marks the venue’s four food options, and no other option in any studio', () => {
    const grouped = Object.entries(STUDIO_OPTION_LIST).flatMap(([mode, list]) =>
      list.filter((option) => option.group !== undefined).map((option) => `${mode}:${option.key}:${option.group}`),
    );
    expect(grouped).toEqual(FOOD_KEYS.map((key) => `VENUE:${key}:food`));
  });

  it('opens all four in the apps and in the Partner console, each on its own page', () => {
    const food = STUDIO_OPTION_LIST.VENUE.filter((option) => option.group === 'food');
    expect(food.map(({ path, route, portal }) => ({ path, route, portal }))).toEqual([
      { path: '/venues/food-dashboard', route: 'VenueFoodDashboard', portal: '/venues/food-dashboard' },
      { path: '/venues/food-menu', route: 'VenueFoodMenu', portal: '/venues/food-menu' },
      { path: '/venues/food-orders', route: 'VenueFoodOrders', portal: '/venues/food-orders' },
      { path: '/venues/food-coupons', route: 'VenueFoodCoupons', portal: '/venues/food-coupons' },
    ]);
  });
});

describe('studioOptionGroups', () => {
  it('splits the venue options into the main menu and the food menu, each in catalogue order', () => {
    const { main, food } = studioOptionGroups(STUDIO_OPTION_LIST.VENUE);
    expect(food.map((option) => option.key)).toEqual(['food-dashboard', 'food-menu', 'food-orders', 'food-coupons']);
    expect(main.map((option) => option.key)).toEqual([
      'dashboard',
      'venues',
      'slot-requests',
      'auto-pods',
      'availability',
      'settings',
      'earnings',
      'publish',
      'pods',
      'change-requests',
      'pod-requests',
      'event-requests',
      'nearby',
      'verification',
      'withdrawal',
    ]);
    // Nothing is dropped and nothing is listed twice.
    expect(main.length + food.length).toBe(STUDIO_OPTION_LIST.VENUE.length);
  });

  it('keeps a studio with no food desk whole, and splits only what it is given', () => {
    expect(studioOptionGroups(STUDIO_OPTION_LIST.HOST)).toEqual({ main: [...STUDIO_OPTION_LIST.HOST], food: [] });
    expect(studioOptionGroups([])).toEqual({ main: [], food: [] });
    // The flag-filtered list splits the same way: Auto Pods off stays off.
    const off = studioOptionGroups(studioOptionsFor('VENUE', ['VENUE_OWNER'], { autoPods: false }));
    expect(off.main.map((option) => option.key)).not.toContain('auto-pods');
    expect(off.food).toHaveLength(4);
  });
});

describe('venue pod phases', () => {
  it('maps the server bucket to Upcoming, Current and Past', () => {
    expect(VENUE_POD_PHASES).toEqual(['UPCOMING', 'CURRENT', 'PAST']);
    expect(venuePodPhase('UPCOMING')).toBe('UPCOMING');
    expect(venuePodPhase('ONGOING')).toBe('CURRENT');
    expect(venuePodPhase('COMPLETED')).toBe('PAST');
    // A cancelled pod is history too; its row says it was cancelled.
    expect(venuePodPhase('CANCELLED')).toBe('PAST');
  });

  it('splits rows by phase, keeping the server’s order within each', () => {
    const rows = [
      { id: 'a', bucket: 'COMPLETED' as const },
      { id: 'b', bucket: 'UPCOMING' as const },
      { id: 'c', bucket: 'ONGOING' as const },
      { id: 'd', bucket: 'UPCOMING' as const },
      { id: 'e', bucket: 'CANCELLED' as const },
    ];
    const split = podsByPhase(rows);
    expect(split.UPCOMING.map((r) => r.id)).toEqual(['b', 'd']);
    expect(split.CURRENT.map((r) => r.id)).toEqual(['c']);
    expect(split.PAST.map((r) => r.id)).toEqual(['a', 'e']);
    expect(podsByPhase([])).toEqual({ UPCOMING: [], CURRENT: [], PAST: [] });
  });
});
