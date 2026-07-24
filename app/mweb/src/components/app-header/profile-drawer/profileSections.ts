/**
 * Static configuration for the consumer profile drawer's card layout. Labels +
 * routes are reusable UI config (not business data); every destination is an
 * existing Duncit route. The icon is a key resolved to an MUI icon in the view,
 * so this module stays pure and unit-testable.
 */
export type ProfileIconKey =
  | 'bookings'
  | 'saved'
  | 'verification'
  | 'support'
  | 'referral'
  | 'account'
  | 'earn'
  | 'ideas'
  | 'plans'
  | 'faqs'
  | 'shop'
  | 'orders'
  | 'addresses'
  | 'cart';

export interface ProfileTile {
  key: string;
  label: string;
  caption: string;
  icon: ProfileIconKey;
  to: string;
}

/** The 2×2 quick-action grid — the four primary consumer destinations. */
export const PROFILE_GRID: readonly ProfileTile[] = [
  { key: 'pod-history', label: 'Pod History', caption: 'Your bookings & history', icon: 'bookings', to: '/pod-history' },
  { key: 'support', label: 'Help & Support', caption: 'Get quick help', icon: 'support', to: '/support' },
  { key: 'earn', label: 'Earn with Duncit', caption: 'Host, list or sell', icon: 'earn', to: '/earn' },
  { key: 'ideas', label: 'Pod Ideas', caption: 'Get inspired', icon: 'ideas', to: '/pod-ideas' },
];

/** The full-width featured referral card. */
export const REFERRAL_TILE: ProfileTile = {
  key: 'referral',
  label: 'Refer & Earn',
  caption: 'Refer your friends and earn now',
  icon: 'referral',
  to: '/referral',
};

/** The "Manage Account" grouped list — the account destinations not in the grid.
 * E-commerce rows live in their own {@link SHOP_ITEMS} section. `showPodPlans`
 * gates the Pod Plans row. */
export function buildManageItems(showPodPlans: boolean): ProfileTile[] {
  const items: ProfileTile[] = [
    { key: 'account', label: 'Manage Account', caption: '', icon: 'account', to: '/account' },
    { key: 'saved', label: 'Saved Items', caption: '', icon: 'saved', to: '/saved' },
    { key: 'verification', label: 'Verification', caption: '', icon: 'verification', to: '/verification' },
    { key: 'faqs', label: 'FAQs', caption: '', icon: 'faqs', to: '/faqs' },
  ];
  if (showPodPlans) {
    // Pod Plans always slots in just before FAQs (the last row).
    items.splice(items.length - 1, 0, { key: 'plans', label: 'Pod Plans', caption: '', icon: 'plans', to: '/pod-plans' });
  }
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
