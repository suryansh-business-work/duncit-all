import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';
import { PROFILE_MENU_ITEMS, type ProfileMenuKey, type ProfileMenuSectionId } from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';
import type { MenuRoute } from '@/navigation/types';

/**
 * The native half of the account menu's catalogue. WHAT the menu lists, its
 * copy, its flags and its grouping are shared with mWeb in `@duncit/utils`
 * `profile-menu`; WHERE each destination goes and the glyph it wears are this
 * app's own. mWeb twin: profile-drawer/profileSections.ts.
 */
export type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface Destination {
  route: MenuRoute;
  icon: IconName;
}

export const MENU_DESTINATIONS: Readonly<Record<ProfileMenuKey, Destination>> = {
  chats: { route: 'Chats', icon: 'chat-bubble-outline' },
  following: { route: 'Following', icon: 'favorite-border' },
  'pod-history': { route: 'PodHistory', icon: 'receipt-long' },
  earn: { route: 'Earn', icon: 'volunteer-activism' },
  ideas: { route: 'PodIdeas', icon: 'lightbulb' },
  support: { route: 'Support', icon: 'support-agent' },
  help: { route: 'Support', icon: 'support-agent' },
  faqs: { route: 'Faqs', icon: 'help-outline' },
  leaderboard: { route: 'Leaderboard', icon: 'emoji-events' },
  badges: { route: 'Badges', icon: 'military-tech' },
  gigs: { route: 'GigJobs', icon: 'work-outline' },
  referral: { route: 'Referral', icon: 'card-giftcard' },
  membership: { route: 'Membership', icon: 'card-membership' },
  shop: { route: 'Shop', icon: 'storefront' },
  cart: { route: 'Cart', icon: 'shopping-cart' },
  'food-orders': { route: 'MyFoodOrders', icon: 'restaurant-menu' },
  'gift-cards-buy': { route: 'GiftCards', icon: 'card-giftcard' },
  'gift-cards-redeem': { route: 'GiftCardRedeem', icon: 'redeem' },
  orders: { route: 'OrdersHistory', icon: 'local-shipping' },
  addresses: { route: 'AddressBook', icon: 'home-work' },
  rentals: { route: 'MyRentedItems', icon: 'handshake' },
  account: { route: 'Account', icon: 'manage-accounts' },
  saved: { route: 'Saved', icon: 'bookmark-border' },
  contacts: { route: 'Contacts', icon: 'contact-phone' },
  verification: { route: 'Verification', icon: 'verified-user' },
  tour: { route: 'TourGuide', icon: 'explore' },
  plans: { route: 'PodPlans', icon: 'category' },
};

/** The rounded tile on each section card. */
export const SECTION_ICONS: Readonly<Record<ProfileMenuSectionId, IconName>> = {
  explore: 'explore',
  work: 'work-outline',
  shopping: 'shopping-bag',
  account: 'manage-accounts',
  support: 'support-agent',
};

/** The Duncit Coin card's destination and glyph. Shown in User mode only. */
export const COIN_DESTINATION: Destination = { route: 'DuncitCoin', icon: 'monetization-on' };

/** One menu destination, translated and ready to draw. */
export interface MenuEntry {
  key: ProfileMenuKey;
  label: string;
  icon: IconName;
  route: MenuRoute;
  /** A pill after the label (Membership's "Coming soon"). */
  badge?: string;
}

/** A destination's translated label and badge, with this app's route and icon. */
export function menuEntry(key: ProfileMenuKey, t: Translate): MenuEntry {
  const item = PROFILE_MENU_ITEMS[key];
  return {
    key,
    label: t(item.labelKey),
    badge: item.badgeKey ? t(item.badgeKey) : undefined,
    ...MENU_DESTINATIONS[key],
  };
}
