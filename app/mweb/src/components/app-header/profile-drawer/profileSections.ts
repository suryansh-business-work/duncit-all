import {
  GIG_JOBS_PATH,
  MY_FOOD_ORDERS_PATH,
  MY_RENTED_ITEMS_PATH,
  PROFILE_MENU_ITEMS,
  TUTORIALS_PATH,
  type ProfileMenuKey,
  type ProfileMenuSectionId,
} from '@duncit/utils';

/**
 * The mWeb half of the account menu's catalogue. WHAT the menu lists, its copy,
 * its flags and its grouping are shared with the native app in `@duncit/utils`
 * `profile-menu`; WHERE each destination goes and the icon it wears are this
 * app's own. The icon is a key resolved to an MUI icon by `profileIcon`, so this
 * module stays pure. Native twin: components/Sidebar/profileSections.ts.
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
  | 'tutorials'
  | 'badges'
  | 'tour'
  | 'shop'
  | 'orders'
  | 'addresses'
  | 'cart'
  | 'rentals'
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
  | 'warehouses'
  | 'menu'
  | 'gigs'
  | 'explore'
  | 'shopping';

interface Destination {
  to: string;
  icon: ProfileIconKey;
}

export const MENU_DESTINATIONS: Readonly<Record<ProfileMenuKey, Destination>> = {
  chats: { to: '/chats', icon: 'chats' },
  following: { to: '/follow', icon: 'following' },
  'pod-history': { to: '/pod-history', icon: 'bookings' },
  earn: { to: '/earn', icon: 'earn' },
  ideas: { to: '/pod-ideas', icon: 'ideas' },
  support: { to: '/support', icon: 'support' },
  help: { to: '/support', icon: 'support' },
  faqs: { to: '/faqs', icon: 'faqs' },
  tutorials: { to: TUTORIALS_PATH, icon: 'tutorials' },
  leaderboard: { to: '/leaderboard', icon: 'leaderboard' },
  badges: { to: '/badges', icon: 'badges' },
  gigs: { to: GIG_JOBS_PATH, icon: 'gigs' },
  referral: { to: '/referral', icon: 'referral' },
  membership: { to: '/membership', icon: 'membership' },
  shop: { to: '/shop', icon: 'shop' },
  cart: { to: '/cart', icon: 'cart' },
  'food-orders': { to: MY_FOOD_ORDERS_PATH, icon: 'menu' },
  'gift-cards-buy': { to: '/gift-cards', icon: 'giftcards' },
  'gift-cards-redeem': { to: '/gift-cards/redeem', icon: 'giftcardRedeem' },
  orders: { to: '/orders', icon: 'orders' },
  addresses: { to: '/address-book', icon: 'addresses' },
  rentals: { to: MY_RENTED_ITEMS_PATH, icon: 'rentals' },
  account: { to: '/account', icon: 'account' },
  saved: { to: '/saved', icon: 'saved' },
  contacts: { to: '/contacts', icon: 'contacts' },
  verification: { to: '/verification', icon: 'verification' },
  tour: { to: '/tour-guide', icon: 'tour' },
  plans: { to: '/pod-plans', icon: 'plans' },
};

/** The rounded tile on each section card. */
export const SECTION_ICONS: Readonly<Record<ProfileMenuSectionId, ProfileIconKey>> = {
  explore: 'explore',
  work: 'gigs',
  shopping: 'shopping',
  account: 'account',
  support: 'support',
};

/** The Duncit Coin card's destination. Shown in User mode only. */
export const COIN_DESTINATION: Destination = { to: '/duncit-coin', icon: 'coin' };

/** One menu destination, translated and ready to draw. */
export interface MenuEntry {
  key: ProfileMenuKey;
  label: string;
  icon: ProfileIconKey;
  to: string;
  /** A pill after the label (Membership's "Coming soon"). */
  badge?: string;
}

/** A destination's translated label and badge, with this app's path and icon. */
export function menuEntry(key: ProfileMenuKey, t: (key: string) => string): MenuEntry {
  const item = PROFILE_MENU_ITEMS[key];
  return {
    key,
    label: t(item.labelKey),
    badge: item.badgeKey ? t(item.badgeKey) : undefined,
    ...MENU_DESTINATIONS[key],
  };
}
