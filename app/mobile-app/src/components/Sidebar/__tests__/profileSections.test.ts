import {
  PROFILE_GRID,
  REFERRAL_TILE,
  SHOP_ITEMS,
  buildManageItems,
  buildPartnerMenus,
} from '../profileSections';

describe('profileSections', () => {
  it('exposes exactly four quick-action tiles pointing at real screens', () => {
    expect(PROFILE_GRID).toHaveLength(4);
    expect(PROFILE_GRID.map((t) => t.route)).toEqual(['PodHistory', 'Support', 'Earn', 'PodIdeas']);
    expect(PROFILE_GRID.every((t) => t.label && t.caption)).toBe(true);
  });

  it('points the referral tile at Referral without a hardcoded amount', () => {
    expect(REFERRAL_TILE.route).toBe('Referral');
    expect(REFERRAL_TILE.caption).not.toMatch(/\d/);
  });

  it('builds the manage list (account rows only) without Pod Plans by default', () => {
    const labels = buildManageItems(false, true).map((i) => i.label);
    expect(labels).toEqual(['Manage Account', 'Saved Items', 'Verification', 'Tour Guide', 'FAQs']);
  });

  it('inserts Pod Plans before FAQs when the flag is on', () => {
    const labels = buildManageItems(true, true).map((i) => i.label);
    expect(labels).toEqual([
      'Manage Account',
      'Saved Items',
      'Verification',
      'Tour Guide',
      'Pod Plans',
      'FAQs',
    ]);
  });

  it('routes every manage item to a Pod-Plans-gated screen name', () => {
    expect(buildManageItems(true, true).map((i) => i.route)).toEqual([
      'Account',
      'Saved',
      'Verification',
      'TourGuide',
      'PodPlans',
      'Faqs',
    ]);
  });

  it('shows only the switched-into mode’s menu, each ending in Withdrawal', () => {
    // User mode is a consumer sidebar even for someone who holds every role.
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
    expect(hostMenu?.items.map((i) => i.route)).toEqual(['HostManage', 'HostDashboard', 'Wallet']);

    expect(buildPartnerMenus(['VENUE_OWNER'], 'VENUE')[0]?.items.map((i) => i.route)).toEqual([
      'VenueManage',
      // Slot Requests sits above earnings: a request is the thing waiting on you.
      'VenueSlotRequests',
      'VenueEarnings',
      'Wallet',
    ]);
    expect(buildPartnerMenus(['ECOMM_MANAGER'], 'ECOMM')[0]?.items.map((i) => i.route)).toEqual([
      'ProductsManage',
      'Wallet',
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

  it('exposes the Shop e-commerce section as its own list of real screens', () => {
    expect(SHOP_ITEMS.map((i) => i.label)).toEqual([
      'Pod Shop',
      'My Product Order History',
      'Address Book',
      'Cart',
    ]);
    expect(SHOP_ITEMS.map((i) => i.route)).toEqual([
      'Shop',
      'OrdersHistory',
      'AddressBook',
      'Cart',
    ]);
  });
});
