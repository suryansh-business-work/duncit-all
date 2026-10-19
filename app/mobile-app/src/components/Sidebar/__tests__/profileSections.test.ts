import { PROFILE_MENU_ITEMS, PROFILE_MENU_SECTIONS, type ProfileMenuKey } from '@duncit/utils';

import { COIN_DESTINATION, MENU_DESTINATIONS, SECTION_ICONS, menuEntry } from '../profileSections';

const KEYS = Object.keys(PROFILE_MENU_ITEMS) as ProfileMenuKey[];

describe('profileSections (native destinations)', () => {
  it('gives every shared menu destination a route and an icon', () => {
    expect(Object.keys(MENU_DESTINATIONS).sort()).toEqual([...KEYS].sort());
    for (const key of KEYS) {
      expect(MENU_DESTINATIONS[key].route).toMatch(/^[A-Z]\w+$/);
      expect(MENU_DESTINATIONS[key].icon).toBeTruthy();
    }
  });

  it('keeps the routes the menu has always opened', () => {
    expect(MENU_DESTINATIONS['pod-history'].route).toBe('PodHistory');
    expect(MENU_DESTINATIONS.support.route).toBe('Support');
    expect(MENU_DESTINATIONS.help.route).toBe('Support');
    expect(MENU_DESTINATIONS.faqs.route).toBe('Faqs');
    expect(MENU_DESTINATIONS.referral.route).toBe('Referral');
    expect(MENU_DESTINATIONS.orders.route).toBe('OrdersHistory');
    expect(MENU_DESTINATIONS['food-orders'].route).toBe('MyFoodOrders');
    expect(MENU_DESTINATIONS['gift-cards-redeem'].route).toBe('GiftCardRedeem');
    expect(MENU_DESTINATIONS.rentals.route).toBe('MyRentedItems');
    expect(COIN_DESTINATION.route).toBe('DuncitCoin');
  });

  it('has an icon tile for every section card', () => {
    expect(Object.keys(SECTION_ICONS).sort()).toEqual(
      PROFILE_MENU_SECTIONS.map((s) => s.id).sort(),
    );
  });

  it('builds an entry with the translated label, the badge and this app’s route', () => {
    const t = jest.fn((key: string) => `[${key}]`);
    expect(menuEntry('membership', t)).toEqual({
      key: 'membership',
      label: '[mweb.membership.sidebarLabel]',
      badge: '[mweb.membership.comingSoon]',
      route: 'Membership',
      icon: 'card-membership',
    });
    expect(menuEntry('saved', t)).toEqual({
      key: 'saved',
      label: '[mweb.saved.savedItems]',
      badge: undefined,
      route: 'Saved',
      icon: 'bookmark-border',
    });
  });
});
