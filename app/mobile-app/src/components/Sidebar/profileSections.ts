import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

import type { MenuRoute } from '@/navigation/types';

/**
 * Static configuration for the consumer profile drawer's card layout — the RN
 * twin of mWeb's `profileSections.ts`. Labels + routes are reusable UI config
 * (not business data); every destination is an existing screen. The `icon` is a
 * MaterialIcons name (a plain string), so this module stays pure/unit-testable —
 * RN icons take a name, so the mWeb key→element indirection isn't needed here.
 */
type IconName = ComponentProps<typeof MaterialIcons>['name'];

export interface ProfileTile {
  key: string;
  label: string;
  caption: string;
  icon: IconName;
  route: MenuRoute;
  /** Optional pill after the label (e.g. "Coming soon"). Already translated by
   * the caller — this module holds no copy. */
  badge?: string;
}

/** The quick-action grid's own four tiles. Chats and Following are prepended by
 * the view, which has the translator the two of them need — they came down from
 * the bottom bar, where their labels were already localized. */
export const PROFILE_GRID: readonly ProfileTile[] = [
  {
    key: 'pod-history',
    label: 'Pod History',
    caption: 'Your bookings & history',
    icon: 'receipt-long',
    route: 'PodHistory',
  },
  {
    key: 'support',
    label: 'Help & Support',
    caption: 'Get quick help',
    icon: 'support-agent',
    route: 'Support',
  },
  {
    key: 'earn',
    label: 'Earn with Duncit',
    caption: 'Host, list or sell',
    icon: 'volunteer-activism',
    route: 'Earn',
  },
  {
    key: 'ideas',
    label: 'Pod Ideas',
    caption: 'Get inspired',
    icon: 'lightbulb',
    route: 'PodIdeas',
  },
];

/** The full-width featured Duncit Coin card. Shown in User mode only — the
 * partner studios are earning surfaces, and the coin balance is a consumer
 * reward, so it stays out of them. */
export const COIN_TILE: ProfileTile = {
  key: 'duncit-coin',
  label: 'Duncit Coin',
  caption: '',
  icon: 'monetization-on',
  route: 'DuncitCoin',
};

/** The full-width featured referral card. */
export const REFERRAL_TILE: ProfileTile = {
  key: 'referral',
  label: 'Refer & Earn',
  caption: 'Refer your friends and earn now',
  icon: 'card-giftcard',
  route: 'Referral',
};

/** The "Manage Account" grouped list — the account destinations not in the grid.
 * E-commerce rows live in their own {@link SHOP_ITEMS} section. `showPodPlans`
 * gates the Pod Plans row, `showTourGuide` the Tour Guide row. `badgesLabel` and
 * `contactsLabel` arrive already translated — this module holds no copy for new
 * rows (rule 38). */
export function buildManageItems(
  showPodPlans: boolean,
  showTourGuide: boolean,
  badgesLabel: string,
  contactsLabel: string,
): ProfileTile[] {
  const items: ProfileTile[] = [
    {
      key: 'account',
      label: 'Manage Account',
      caption: '',
      icon: 'manage-accounts',
      route: 'Account',
    },
    { key: 'saved', label: 'Saved Items', caption: '', icon: 'bookmark-border', route: 'Saved' },
    {
      key: 'contacts',
      label: contactsLabel,
      caption: '',
      icon: 'contact-phone',
      route: 'Contacts',
    },
    {
      key: 'verification',
      label: 'Verification',
      caption: '',
      icon: 'verified-user',
      route: 'Verification',
    },
  ];
  if (showTourGuide) {
    items.push({
      key: 'tour',
      label: 'Tour Guide',
      caption: '',
      icon: 'explore',
      route: 'TourGuide',
    });
  }
  if (showPodPlans) {
    // Pod Plans always slots in just before FAQs.
    items.push({
      key: 'plans',
      label: 'Pod Plans',
      caption: '',
      icon: 'category',
      route: 'PodPlans',
    });
  }
  // Badges sits directly under FAQs, and is the last row of the section.
  items.push(
    { key: 'faqs', label: 'FAQs', caption: '', icon: 'help-outline', route: 'Faqs' },
    { key: 'badges', label: badgesLabel, caption: '', icon: 'military-tech', route: 'Badges' },
  );
  return items;
}

/** The "Shop" grouped list — the e-commerce destinations, a section that sits
 * parallel to Manage Account. Static (no flag gating), so a plain const. */
export const SHOP_ITEMS: readonly ProfileTile[] = [
  { key: 'shop', label: 'Pod Shop', caption: '', icon: 'storefront', route: 'Shop' },
  {
    key: 'orders',
    label: 'My Product Order History',
    caption: '',
    icon: 'local-shipping',
    route: 'OrdersHistory',
  },
  { key: 'addresses', label: 'Address Book', caption: '', icon: 'home-work', route: 'AddressBook' },
  { key: 'cart', label: 'Cart', caption: '', icon: 'shopping-cart', route: 'Cart' },
];
