import { PROFILE_GRID, REFERRAL_TILE, SHOP_ITEMS, buildManageItems } from '../profileSections';

/** The sidebar's Badges row arrives already translated, so the test passes the
 * label the same way the component does. */
const BADGES_LABEL = 'Badges';
const CONTACTS_LABEL = 'Your Contacts on Duncit';

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
    const labels = buildManageItems(false, true, BADGES_LABEL, CONTACTS_LABEL).map((i) => i.label);
    expect(labels).toEqual([
      'Manage Account',
      'Saved Items',
      CONTACTS_LABEL,
      'Verification',
      'Tour Guide',
      'FAQs',
      BADGES_LABEL,
    ]);
  });

  it('inserts Pod Plans before FAQs when the flag is on', () => {
    const labels = buildManageItems(true, true, BADGES_LABEL, CONTACTS_LABEL).map((i) => i.label);
    expect(labels).toEqual([
      'Manage Account',
      'Saved Items',
      CONTACTS_LABEL,
      'Verification',
      'Tour Guide',
      'Pod Plans',
      'FAQs',
      BADGES_LABEL,
    ]);
  });

  it('routes every manage item to a Pod-Plans-gated screen name', () => {
    expect(buildManageItems(true, true, BADGES_LABEL, CONTACTS_LABEL).map((i) => i.route)).toEqual([
      'Account',
      'Saved',
      'Contacts',
      'Verification',
      'TourGuide',
      'PodPlans',
      'Faqs',
      'Badges',
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
