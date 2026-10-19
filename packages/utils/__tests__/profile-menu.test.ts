import { describe, expect, it } from 'vitest';

import {
  DEFAULT_QUICK_ACCESS,
  PROFILE_MENU_ITEMS,
  PROFILE_MENU_SECTIONS,
  QUICK_ACCESS_CATALOGUE,
  QUICK_ACCESS_SIZE,
  availableQuickAccess,
  isProfileMenuItemVisible,
  isValidQuickAccess,
  moveQuickAccess,
  normaliseQuickAccess,
  parseStoredQuickAccess,
  profileMenuFlagsFrom,
  profileMenuSections,
  profileSectionSubtitleKeys,
  quickAccessEditorRows,
  toggleQuickAccess,
  type ProfileMenuFlags,
  type ProfileMenuSectionDef,
} from '../src/profile-menu';

const ALL_ON: ProfileMenuFlags = {
  pod_plans_section: true,
  leaderboard: true,
  membership: true,
  gift_cards: true,
  tour_guide: true,
  products: true,
};
const ALL_OFF: ProfileMenuFlags = {};

const sectionKeys = (flags: ProfileMenuFlags) =>
  profileMenuSections(flags).map((section) => ({
    id: section.id,
    items: section.items.map((item) => item.key),
  }));

describe('profile menu catalogue', () => {
  it('keys every entry by its own key, with a translation key for the label', () => {
    for (const [key, item] of Object.entries(PROFILE_MENU_ITEMS)) {
      expect(item.key).toBe(key);
      expect(item.labelKey).toMatch(/^[a-zA-Z]+(\.[a-zA-Z]+)+$/);
    }
  });

  it('defaults to Chats, Following, Pod History, Earn, Pod Ideas and Help & Support', () => {
    expect(DEFAULT_QUICK_ACCESS).toEqual(['chats', 'following', 'pod-history', 'earn', 'ideas', 'support']);
    expect(DEFAULT_QUICK_ACCESS).toHaveLength(QUICK_ACCESS_SIZE);
    expect(DEFAULT_QUICK_ACCESS.every((key) => QUICK_ACCESS_CATALOGUE.includes(key))).toBe(true);
  });

  it('never gates a default tile on a flag, so the default grid is always whole', () => {
    expect(DEFAULT_QUICK_ACCESS.every((key) => PROFILE_MENU_ITEMS[key].flag === undefined)).toBe(true);
    expect(normaliseQuickAccess(null, ALL_OFF)).toEqual([...DEFAULT_QUICK_ACCESS]);
  });

  it('lists every catalogue entry once', () => {
    expect(new Set(QUICK_ACCESS_CATALOGUE).size).toBe(QUICK_ACCESS_CATALOGUE.length);
  });
});

describe('isProfileMenuItemVisible', () => {
  it('shows an ungated destination whatever the flags say', () => {
    expect(isProfileMenuItemVisible('saved', ALL_OFF)).toBe(true);
  });

  it('hides a gated destination until its flag is explicitly on', () => {
    expect(isProfileMenuItemVisible('leaderboard', ALL_OFF)).toBe(false);
    expect(isProfileMenuItemVisible('leaderboard', { leaderboard: false })).toBe(false);
    expect(isProfileMenuItemVisible('leaderboard', { leaderboard: true })).toBe(true);
    expect(isProfileMenuItemVisible('cart', { leaderboard: true })).toBe(false);
    expect(isProfileMenuItemVisible('cart', { products: true })).toBe(true);
  });
});

describe('availableQuickAccess', () => {
  it('drops the flag-gated tiles while their flags are off', () => {
    const off = availableQuickAccess(ALL_OFF);
    expect(off).not.toContain('leaderboard');
    expect(off).not.toContain('shop');
    expect(off).not.toContain('cart');
    expect(off).toContain('chats');
  });

  it('offers the whole catalogue, in catalogue order, with every flag on', () => {
    expect(availableQuickAccess(ALL_ON)).toEqual([...QUICK_ACCESS_CATALOGUE]);
  });
});

describe('isValidQuickAccess', () => {
  const six = ['chats', 'saved', 'gigs', 'faqs', 'badges', 'referral'];

  it('accepts six distinct pickable destinations in any order', () => {
    expect(isValidQuickAccess(six, ALL_OFF)).toBe(true);
    expect(isValidQuickAccess([...six].reverse(), ALL_OFF)).toBe(true);
  });

  it('refuses fewer or more than six', () => {
    expect(isValidQuickAccess(six.slice(0, 5), ALL_ON)).toBe(false);
    expect(isValidQuickAccess([...six, 'support'], ALL_ON)).toBe(false);
    expect(isValidQuickAccess([], ALL_ON)).toBe(false);
  });

  it('refuses a destination picked twice', () => {
    expect(isValidQuickAccess(['chats', 'chats', 'gigs', 'faqs', 'badges', 'referral'], ALL_ON)).toBe(false);
  });

  it('refuses a key outside the catalogue, a section-only row and a non-string', () => {
    expect(isValidQuickAccess([...six.slice(0, 5), 'nope'], ALL_ON)).toBe(false);
    expect(isValidQuickAccess([...six.slice(0, 5), 'verification'], ALL_ON)).toBe(false);
    expect(isValidQuickAccess([...six.slice(0, 5), 7], ALL_ON)).toBe(false);
  });

  it('refuses a gated destination while its flag is off, and accepts it once on', () => {
    const withCart = [...six.slice(0, 5), 'cart'];
    expect(isValidQuickAccess(withCart, ALL_OFF)).toBe(false);
    expect(isValidQuickAccess(withCart, { products: true })).toBe(true);
  });
});

describe('normaliseQuickAccess', () => {
  it('keeps a valid stored pick exactly, order included', () => {
    const stored = ['faqs', 'saved', 'chats', 'gigs', 'badges', 'referral'];
    expect(normaliseQuickAccess(stored, ALL_OFF)).toEqual(stored);
  });

  it('reads anything that is not an array as never edited', () => {
    for (const stored of [null, undefined, 'chats', 42, { 0: 'chats' }]) {
      expect(normaliseQuickAccess(stored, ALL_OFF)).toEqual([...DEFAULT_QUICK_ACCESS]);
    }
  });

  it('drops unknown, duplicate and non-string keys, then tops up from the defaults', () => {
    const result = normaliseQuickAccess(['gigs', 'gigs', 'retired-tile', 3, 'faqs'], ALL_OFF);
    expect(result).toEqual(['gigs', 'faqs', 'chats', 'following', 'pod-history', 'earn']);
  });

  it('drops a tile whose flag went off and fills the hole, never leaving fewer than six', () => {
    const stored = ['cart', 'shop', 'leaderboard', 'saved', 'gigs', 'faqs'];
    expect(normaliseQuickAccess(stored, ALL_ON)).toEqual(stored);
    expect(normaliseQuickAccess(stored, ALL_OFF)).toEqual(['saved', 'gigs', 'faqs', 'chats', 'following', 'pod-history']);
  });

  it('caps a stored list that is too long at the first six pickable keys', () => {
    const stored = [...QUICK_ACCESS_CATALOGUE].reverse();
    const result = normaliseQuickAccess(stored, ALL_ON);
    expect(result).toEqual(stored.slice(0, QUICK_ACCESS_SIZE));
  });

  it('tops up with the first default not already picked', () => {
    const result = normaliseQuickAccess(['support', 'ideas', 'earn', 'pod-history', 'following'], ALL_OFF);
    expect(result).toEqual(['support', 'ideas', 'earn', 'pod-history', 'following', 'chats']);
  });

  it('always returns a pick the validator accepts', () => {
    for (const flags of [ALL_ON, ALL_OFF, { products: true }]) {
      for (const stored of [null, ['cart'], ['x', 'y'], [...QUICK_ACCESS_CATALOGUE]]) {
        expect(isValidQuickAccess(normaliseQuickAccess(stored, flags), flags)).toBe(true);
      }
    }
  });
});

describe('parseStoredQuickAccess', () => {
  it('parses a stored JSON pick', () => {
    const stored = ['saved', 'chats', 'gigs', 'faqs', 'badges', 'referral'];
    expect(parseStoredQuickAccess(JSON.stringify(stored), ALL_OFF)).toEqual(stored);
  });

  it('falls back to the defaults for nothing stored and for corrupt JSON', () => {
    expect(parseStoredQuickAccess(null, ALL_OFF)).toEqual([...DEFAULT_QUICK_ACCESS]);
    expect(parseStoredQuickAccess('', ALL_OFF)).toEqual([...DEFAULT_QUICK_ACCESS]);
    expect(parseStoredQuickAccess('{not json', ALL_OFF)).toEqual([...DEFAULT_QUICK_ACCESS]);
  });
});

describe('profileMenuSections', () => {
  it('groups every row into the five sections, in order, with every flag on', () => {
    expect(sectionKeys(ALL_ON)).toEqual([
      { id: 'explore', items: ['ideas', 'leaderboard', 'badges'] },
      { id: 'work', items: ['gigs', 'referral', 'membership'] },
      {
        id: 'shopping',
        items: ['shop', 'cart', 'food-orders', 'gift-cards-buy', 'gift-cards-redeem', 'orders', 'addresses', 'rentals'],
      },
      { id: 'account', items: ['account', 'saved', 'contacts', 'verification', 'tour', 'plans'] },
      { id: 'support', items: ['help', 'faqs'] },
    ]);
  });

  it('keeps only the ungated rows with every flag off', () => {
    expect(sectionKeys(ALL_OFF)).toEqual([
      { id: 'explore', items: ['ideas', 'badges'] },
      { id: 'work', items: ['gigs', 'referral'] },
      { id: 'shopping', items: ['food-orders', 'rentals'] },
      { id: 'account', items: ['account', 'saved', 'contacts', 'verification'] },
      { id: 'support', items: ['help', 'faqs'] },
    ]);
  });

  it('carries each section title key from the definitions', () => {
    expect(profileMenuSections(ALL_ON).map((s) => s.titleKey)).toEqual(PROFILE_MENU_SECTIONS.map((s) => s.titleKey));
  });

  it('leaves out a section whose rows are all hidden, unless the app adds rows of its own', () => {
    // Every section today has an ungated row, so prove the rule on a gated-only one.
    const sections: ProfileMenuSectionDef[] = [
      { id: 'explore', titleKey: 'mweb.sidebar.sectionExplore', items: ['leaderboard'] },
      { id: 'support', titleKey: 'mweb.sidebar.sectionSupport', items: ['help'] },
    ];
    expect(profileMenuSections(ALL_OFF, { sections }).map((s) => s.id)).toEqual(['support']);
    const kept = profileMenuSections(ALL_OFF, { sections, extraRows: ['explore'] });
    expect(kept.map((s) => s.id)).toEqual(['explore', 'support']);
    expect(kept[0].items).toEqual([]);
    expect(profileMenuSections({ leaderboard: true }, { sections }).map((s) => s.id)).toEqual(['explore', 'support']);
  });
});

describe('profileSectionSubtitleKeys', () => {
  it('names each visible row, the gift-card pair once, food by its short name', () => {
    const shopping = profileMenuSections(ALL_ON).find((s) => s.id === 'shopping');
    expect(profileSectionSubtitleKeys(shopping?.items ?? [])).toEqual([
      'mweb.shop.title',
      'mweb.nav.cart',
      'mweb.venueFood.myOrders.sidebarTitle',
      'mweb.giftCards.title',
      'mweb.sidebar.productOrders',
      'mweb.addressBook.addressBook',
      'venueRentals.guest.sidebarLabel',
    ]);
  });

  it('lists only what is visible', () => {
    const explore = profileMenuSections(ALL_OFF).find((s) => s.id === 'explore');
    expect(profileSectionSubtitleKeys(explore?.items ?? [])).toEqual([
      'mweb.podIdeas.podIdeas',
      'mweb.badges.sidebarLabel',
    ]);
  });

  it('is empty for no rows', () => {
    expect(profileSectionSubtitleKeys([])).toEqual([]);
  });
});

describe('quickAccessEditorRows', () => {
  it('lists the picked tiles first, in grid order, then the rest of the catalogue', () => {
    const rows = quickAccessEditorRows(['faqs', 'chats'], ALL_OFF);
    expect(rows.slice(0, 2)).toEqual(['faqs', 'chats']);
    expect(rows.slice(2)).toEqual(availableQuickAccess(ALL_OFF).filter((k) => k !== 'faqs' && k !== 'chats'));
  });

  it('offers a gated destination only while its flag is on', () => {
    expect(quickAccessEditorRows([], ALL_OFF)).not.toContain('cart');
    expect(quickAccessEditorRows([], { products: true })).toContain('cart');
  });
});

describe('toggleQuickAccess', () => {
  it('unpicks a picked tile and keeps the others in order', () => {
    expect(toggleQuickAccess(['chats', 'saved', 'gigs'], 'saved')).toEqual(['chats', 'gigs']);
  });

  it('appends a new pick at the end', () => {
    expect(toggleQuickAccess(['chats'], 'faqs')).toEqual(['chats', 'faqs']);
  });

  it('refuses a seventh pick, leaving the six untouched', () => {
    const full = [...DEFAULT_QUICK_ACCESS];
    const next = toggleQuickAccess(full, 'saved');
    expect(next).toEqual(full);
    expect(next).not.toBe(full);
  });
});

describe('profileMenuFlagsFrom', () => {
  it('turns on exactly the menu flags the server enables, reading products from the shop flag', () => {
    const flags = profileMenuFlagsFrom(
      [
        { key: 'leaderboard', enabled: true },
        { key: 'membership', enabled: false },
        { key: 'is_product_visible', enabled: true },
        { key: 'unrelated', enabled: true },
      ],
      'is_product_visible',
    );
    expect(flags).toEqual({
      pod_plans_section: false,
      leaderboard: true,
      membership: false,
      gift_cards: false,
      tour_guide: false,
      products: true,
    });
  });

  it('counts a flag that is missing, null or not loaded yet as off', () => {
    const off = {
      pod_plans_section: false,
      leaderboard: false,
      membership: false,
      gift_cards: false,
      tour_guide: false,
      products: false,
    };
    expect(profileMenuFlagsFrom(undefined, 'is_product_visible')).toEqual(off);
    expect(profileMenuFlagsFrom([{ key: 'gift_cards', enabled: null }], 'is_product_visible')).toEqual(off);
    // The menu's `products` name is not the server key: only the passed-in key turns it on.
    expect(profileMenuFlagsFrom([{ key: 'products', enabled: true }], 'is_product_visible').products).toBe(false);
  });
});

describe('moveQuickAccess', () => {
  const picked = ['chats', 'saved', 'gigs'] as const;

  it('swaps a tile with its neighbour up or down', () => {
    expect(moveQuickAccess(picked, 1, -1)).toEqual(['saved', 'chats', 'gigs']);
    expect(moveQuickAccess(picked, 1, 1)).toEqual(['chats', 'gigs', 'saved']);
  });

  it('changes nothing for a move off either end or from a missing index', () => {
    expect(moveQuickAccess(picked, 0, -1)).toEqual([...picked]);
    expect(moveQuickAccess(picked, 2, 1)).toEqual([...picked]);
    expect(moveQuickAccess(picked, 5, -1)).toEqual([...picked]);
    expect(moveQuickAccess(picked, -1, 1)).toEqual([...picked]);
  });
});
