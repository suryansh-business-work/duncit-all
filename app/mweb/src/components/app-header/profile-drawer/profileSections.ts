
/**
 * Static configuration for the consumer profile drawer's card layout. Labels +
 * routes are reusable UI config (not business data); every destination is an
 * existing Duncit route. The icon is a key resolved to an MUI icon in the view,
 * so this module stays pure and unit-testable.
 */
export type ProfileIconKey =
  | 'chats'
  | 'following'
  | 'bookings'
  | 'saved'
  | 'contacts'
  | 'verification'
  | 'support'
  | 'referral'
  | 'account'
  | 'earn'
  | 'ideas'
  | 'plans'
  | 'faqs'
  | 'badges'
  | 'tour'
  | 'shop'
  | 'orders'
  | 'addresses'
  | 'cart'
  | 'wallet'
  | 'coin'
  | 'leaderboard'
  | 'membership'
  | 'giftcards'
  | 'giftcardRedeem'
  | 'pods'
  | 'venue'
  | 'ecomm'
  | 'insights'
  | 'calendar'
  | 'availability'
  | 'settings'
  | 'autopods'
  | 'dashboard'
  | 'monitoring'
  | 'requests'
  | 'change'
  | 'nearby'
  | 'create'
  | 'publish'
  | 'clubs'
  | 'integrations'
  | 'returns'
  | 'warehouses';

export interface ProfileTile {
  key: string;
  label: string;
  caption: string;
  icon: ProfileIconKey;
  to: string;
  /** Optional pill after the label (e.g. "Coming soon"). Already translated by
   * the caller — this module holds no copy. */
  badge?: string;
}

/** The quick-action grid's own four tiles. Chats and Following are prepended by
 * the view, which has the translator the two of them need — they came down from
 * the bottom bar, where their labels were already localized. */
export const PROFILE_GRID: readonly ProfileTile[] = [
  { key: 'pod-history', label: 'Pod History', caption: 'Your bookings & history', icon: 'bookings', to: '/pod-history' },
  { key: 'support', label: 'Help & Support', caption: 'Get quick help', icon: 'support', to: '/support' },
  { key: 'earn', label: 'Earn with Duncit', caption: 'Host, list or sell', icon: 'earn', to: '/earn' },
  { key: 'ideas', label: 'Pod Ideas', caption: 'Get inspired', icon: 'ideas', to: '/pod-ideas' },
];

/** The full-width featured Duncit Coin card. Shown in User mode only — the
 * partner studios are earning surfaces, and the coin balance is a consumer
 * reward, so it stays out of them. */
export const COIN_TILE: ProfileTile = {
  key: 'duncit-coin',
  label: 'Duncit Coin',
  caption: '',
  icon: 'coin',
  to: '/duncit-coin',
};

/** The full-width featured referral card. */
export const REFERRAL_TILE: ProfileTile = {
  key: 'referral',
  label: 'Refer & Earn',
  caption: 'Refer your friends and earn now',
  icon: 'referral',
  to: '/referral',
};

/**
 * The "Manage Account" grouped list — the account destinations not in the grid.
 * E-commerce rows live in their own {@link SHOP_ITEMS} section. `showPodPlans`
 * gates the Pod Plans row, `showTourGuide` the Tour Guide row. `badgesLabel` and
 * `contactsLabel` arrive already translated — this module holds no copy for new
 * rows (rule 38).
 */
export function buildManageItems(
  showPodPlans: boolean,
  showTourGuide: boolean,
  badgesLabel: string,
  contactsLabel: string
): ProfileTile[] {
  const items: ProfileTile[] = [
    { key: 'account', label: 'Manage Account', caption: '', icon: 'account', to: '/account' },
    { key: 'saved', label: 'Saved Items', caption: '', icon: 'saved', to: '/saved' },
    { key: 'contacts', label: contactsLabel, caption: '', icon: 'contacts', to: '/contacts' },
    { key: 'verification', label: 'Verification', caption: '', icon: 'verification', to: '/verification' },
  ];
  if (showTourGuide) {
    items.push({ key: 'tour', label: 'Tour Guide', caption: '', icon: 'tour', to: '/tour-guide' });
  }
  if (showPodPlans) {
    // Pod Plans always slots in just before FAQs.
    items.push({ key: 'plans', label: 'Pod Plans', caption: '', icon: 'plans', to: '/pod-plans' });
  }
  // Badges sits directly under FAQs, and is the last row of the section.
  items.push(
    { key: 'faqs', label: 'FAQs', caption: '', icon: 'faqs', to: '/faqs' },
    { key: 'badges', label: badgesLabel, caption: '', icon: 'badges', to: '/badges' }
  );
  return items;
}

/** The "Shop" grouped list — the e-commerce destinations, a section that sits
 * parallel to Manage Account. Static (no flag gating), so a plain const. */
export const SHOP_ITEMS: readonly ProfileTile[] = [
  { key: 'shop', label: 'Pod Shop', caption: '', icon: 'shop', to: '/shop' },
  { key: 'orders', label: 'My Product Order History', caption: '', icon: 'orders', to: '/orders' },
  { key: 'addresses', label: 'Address Book', caption: '', icon: 'addresses', to: '/address-book' },
  { key: 'cart', label: 'Cart', caption: '', icon: 'cart', to: '/cart' },
];
