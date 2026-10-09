import { describe, expect, it } from 'vitest';
import {
  STUDIO_OPTIONS_ENTRY,
  STUDIO_OPTION_LIST,
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
      'pods',
      'change-requests',
      'pod-requests',
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

  it('opens the brand catalogue, integrations and returns in the Partner console', () => {
    const portalOnly = STUDIO_OPTION_LIST.ECOMM.filter((option) => !option.path).map((option) => option.portal);
    expect(portalOnly).toEqual(['/ecomm-brand', '/ecomm-brand/integrations', '/ecomm-brand/returns']);
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

  it('is empty in User mode and for a studio the user does not hold', () => {
    expect(studioOptionsFor('USER', EVERY_ROLE, { autoPods: true })).toEqual([]);
    expect(studioOptionsFor('ECOMM', ['HOST'], { autoPods: true })).toEqual([]);
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
