import { describe, expect, it } from 'vitest';
import {
  PROFILE_GRID,
  REFERRAL_TILE,
  SHOP_ITEMS,
  buildManageItems,
  buildPartnerMenus,
} from '../profileSections';

/** The drawer's Badges row arrives already translated, so the test passes the
 * label the same way the component does. */
const BADGES_LABEL = 'Badges';

describe('profileSections', () => {
  it('exposes exactly four quick-action tiles pointing at real routes', () => {
    expect(PROFILE_GRID).toHaveLength(4);
    expect(PROFILE_GRID.map((t) => t.label)).toEqual([
      'Pod History',
      'Help & Support',
      'Earn with Duncit',
      'Pod Ideas',
    ]);
    expect(PROFILE_GRID.map((t) => t.to)).toEqual([
      '/pod-history',
      '/support',
      '/earn',
      '/pod-ideas',
    ]);
    expect(PROFILE_GRID.every((t) => t.label && t.caption)).toBe(true);
  });

  it('the referral tile points at /referral without a hardcoded amount', () => {
    expect(REFERRAL_TILE.to).toBe('/referral');
    expect(REFERRAL_TILE.caption).not.toMatch(/\d/);
  });

  it('builds the manage list (account rows only) without Pod Plans by default', () => {
    const labels = buildManageItems(false, true, BADGES_LABEL).map((i) => i.label);
    expect(labels).toEqual([
      'Manage Account',
      'Saved Items',
      'Verification',
      'Tour Guide',
      'FAQs',
      BADGES_LABEL,
    ]);
  });

  it('inserts Pod Plans before FAQs when the flag is on', () => {
    const labels = buildManageItems(true, true, BADGES_LABEL).map((i) => i.label);
    expect(labels).toEqual([
      'Manage Account',
      'Saved Items',
      'Verification',
      'Tour Guide',
      'Pod Plans',
      'FAQs',
      BADGES_LABEL,
    ]);
  });

  it('exposes the Shop e-commerce section as its own list of real routes', () => {
    expect(SHOP_ITEMS.map((i) => i.label)).toEqual([
      'Pod Shop',
      'My Product Order History',
      'Address Book',
      'Cart',
    ]);
    expect(SHOP_ITEMS.map((i) => i.to)).toEqual(['/shop', '/orders', '/address-book', '/cart']);
  });

  it('shows only the switched-into mode’s menu, each ending in Withdrawal', () => {
    // User mode is a consumer drawer even for someone who holds every role.
    const everyRole = ['HOST', 'VENUE_OWNER', 'ECOMM_MANAGER', 'CLUB_ADMIN'];
    expect(buildPartnerMenus(everyRole, 'USER')).toEqual([]);
    expect(buildPartnerMenus([], 'HOST')).toEqual([]);
    // A revoked role cannot keep a persisted mode alive.
    expect(buildPartnerMenus(['VENUE_OWNER'], 'HOST')).toEqual([]);

    const [hostMenu] = buildPartnerMenus(['HOST'], 'HOST');
    expect(hostMenu?.title).toBe('Host Menu');
    expect(hostMenu?.items.map((i) => i.label)).toEqual([
      'Host Studio',
      'Host Dashboard',
      'Withdrawal',
    ]);
    expect(hostMenu?.items.map((i) => i.to)).toEqual([
      '/host/manage',
      '/host/dashboard',
      '/host/wallet',
    ]);

    expect(buildPartnerMenus(['VENUE_OWNER'], 'VENUE')[0]?.items.map((i) => i.to)).toEqual([
      '/venues/manage',
      // Slot Requests sits above earnings: a request is the thing waiting on you.
      '/venues/slot-requests',
      '/venues/earnings',
      '/host/wallet',
    ]);
    expect(buildPartnerMenus(['ECOMM_MANAGER'], 'ECOMM')[0]?.items.map((i) => i.to)).toEqual([
      '/products/manage',
      '/host/wallet',
    ]);
    // Club administration has no in-app studio — Withdrawal alone.
    expect(buildPartnerMenus(['CLUB_ADMIN'], 'CLUB')[0]?.items.map((i) => i.label)).toEqual([
      'Withdrawal',
    ]);

    // A dual-role user sees one menu at a time — whichever they switched to.
    expect(buildPartnerMenus(['HOST', 'VENUE_OWNER'], 'VENUE').map((m) => m.title)).toEqual([
      'Venue Menu',
    ]);
  });

  it('every route is absolute', () => {
    const everyRole = ['HOST', 'VENUE_OWNER', 'ECOMM_MANAGER', 'CLUB_ADMIN'];
    const partnerTiles = (['HOST', 'VENUE', 'ECOMM', 'CLUB'] as const).flatMap((mode) =>
      buildPartnerMenus(everyRole, mode).flatMap((m) => m.items),
    );
    const all = [
      ...PROFILE_GRID,
      REFERRAL_TILE,
      ...buildManageItems(true, true, BADGES_LABEL),
      ...partnerTiles,
      ...SHOP_ITEMS,
    ];
    expect(all.every((t) => t.to.startsWith('/'))).toBe(true);
  });
});
