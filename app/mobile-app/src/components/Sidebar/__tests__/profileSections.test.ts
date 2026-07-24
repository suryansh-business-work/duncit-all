import { PROFILE_GRID, REFERRAL_TILE, SHOP_ITEMS, buildManageItems } from '../profileSections';

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
    const labels = buildManageItems(false).map((i) => i.label);
    expect(labels).toEqual(['Manage Account', 'Saved Items', 'Verification', 'FAQs']);
  });

  it('inserts Pod Plans before FAQs when the flag is on', () => {
    const labels = buildManageItems(true).map((i) => i.label);
    expect(labels).toEqual(['Manage Account', 'Saved Items', 'Verification', 'Pod Plans', 'FAQs']);
  });

  it('routes every manage item to a Pod-Plans-gated screen name', () => {
    expect(buildManageItems(true).map((i) => i.route)).toEqual([
      'Account',
      'Saved',
      'Verification',
      'PodPlans',
      'Faqs',
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
