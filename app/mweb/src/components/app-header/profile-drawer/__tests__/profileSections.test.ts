import { describe, expect, it, vi } from 'vitest';
import { PROFILE_MENU_ITEMS, PROFILE_MENU_SECTIONS, type ProfileMenuKey } from '@duncit/utils';
import { COIN_DESTINATION, MENU_DESTINATIONS, SECTION_ICONS, menuEntry } from '../profileSections';

const KEYS = Object.keys(PROFILE_MENU_ITEMS) as ProfileMenuKey[];

describe('profileSections (mWeb destinations)', () => {
  it('gives every shared menu destination an absolute path and an icon', () => {
    expect(Object.keys(MENU_DESTINATIONS).sort()).toEqual([...KEYS].sort());
    for (const key of KEYS) {
      expect(MENU_DESTINATIONS[key].to.startsWith('/')).toBe(true);
      expect(MENU_DESTINATIONS[key].icon).toBeTruthy();
    }
    expect(COIN_DESTINATION.to).toBe('/duncit-coin');
  });

  it('keeps the paths the menu has always opened', () => {
    expect(MENU_DESTINATIONS.following.to).toBe('/follow');
    expect(MENU_DESTINATIONS['pod-history'].to).toBe('/pod-history');
    expect(MENU_DESTINATIONS.help.to).toBe('/support');
    expect(MENU_DESTINATIONS.orders.to).toBe('/orders');
    expect(MENU_DESTINATIONS.addresses.to).toBe('/address-book');
    expect(MENU_DESTINATIONS['gift-cards-redeem'].to).toBe('/gift-cards/redeem');
    expect(MENU_DESTINATIONS.tour.to).toBe('/tour-guide');
  });

  it('has an icon tile for every section card', () => {
    expect(Object.keys(SECTION_ICONS).sort()).toEqual(PROFILE_MENU_SECTIONS.map((s) => s.id).sort());
  });

  it('builds an entry with the translated label, the badge and this app’s path', () => {
    const t = vi.fn((key: string) => `[${key}]`);
    expect(menuEntry('membership', t)).toEqual({
      key: 'membership',
      label: '[mweb.membership.sidebarLabel]',
      badge: '[mweb.membership.comingSoon]',
      to: '/membership',
      icon: 'membership',
    });
    expect(menuEntry('cart', t).badge).toBeUndefined();
  });
});
