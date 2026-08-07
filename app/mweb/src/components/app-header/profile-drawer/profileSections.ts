import type { StudioMode } from '../../../studio-mode';

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
  | 'tour'
  | 'shop'
  | 'orders'
  | 'addresses'
  | 'cart'
  | 'wallet'
  | 'coin'
  | 'host'
  | 'venue'
  | 'ecomm'
  | 'insights'
  | 'calendar';

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

/** The "Manage Account" grouped list — the account destinations not in the grid.
 * E-commerce rows live in their own {@link SHOP_ITEMS} section. `showPodPlans`
 * gates the Pod Plans row. */
export function buildManageItems(showPodPlans: boolean): ProfileTile[] {
  const items: ProfileTile[] = [
    { key: 'account', label: 'Manage Account', caption: '', icon: 'account', to: '/account' },
    { key: 'saved', label: 'Saved Items', caption: '', icon: 'saved', to: '/saved' },
    { key: 'verification', label: 'Verification', caption: '', icon: 'verification', to: '/verification' },
    { key: 'tour', label: 'Tour Guide', caption: '', icon: 'tour', to: '/tour-guide' },
    { key: 'faqs', label: 'FAQs', caption: '', icon: 'faqs', to: '/faqs' },
  ];
  if (showPodPlans) {
    // Pod Plans always slots in just before FAQs (the last row).
    items.splice(items.length - 1, 0, { key: 'plans', label: 'Pod Plans', caption: '', icon: 'plans', to: '/pod-plans' });
  }
  return items;
}

/** One partner role's own grouped drawer section. */
export interface PartnerMenu {
  key: string;
  title: string;
  items: ProfileTile[];
}

/** Withdrawal points at the one shared wallet page whichever role earned into
 * it, so every partner menu ends with this same row. A pure consumer holds none
 * of these roles, gets no menu, and therefore never sees Withdrawal. */
const WITHDRAWAL_TILE: ProfileTile = {
  key: 'withdrawal',
  label: 'Withdrawal',
  caption: 'Withdraw your earnings',
  icon: 'wallet',
  to: '/host/wallet',
};

interface PartnerMenuSpec {
  /** Studio mode that reveals the section — it shows only while switched in. */
  mode: StudioMode;
  /** Role that unlocks the section. */
  role: string;
  key: string;
  title: string;
  /** Destinations unique to the role — Withdrawal is appended to every menu. */
  items: readonly ProfileTile[];
}

const PARTNER_MENUS: readonly PartnerMenuSpec[] = [
  {
    mode: 'HOST',
    role: 'HOST',
    key: 'host',
    title: 'Host Menu',
    items: [
      { key: 'host-studio', label: 'Host Studio', caption: '', icon: 'host', to: '/host/manage' },
      { key: 'host-dashboard', label: 'Host Dashboard', caption: '', icon: 'insights', to: '/host/dashboard' },
    ],
  },
  {
    mode: 'VENUE',
    role: 'VENUE_OWNER',
    key: 'venue',
    title: 'Venue Menu',
    items: [
      { key: 'venue-studio', label: 'Venue Studio', caption: '', icon: 'venue', to: '/venues/manage' },
      { key: 'venue-slot-requests', label: 'Slot Requests', caption: '', icon: 'calendar', to: '/venues/slot-requests' },
      { key: 'venue-earnings', label: 'Venue Earnings', caption: '', icon: 'insights', to: '/venues/earnings' },
    ],
  },
  {
    mode: 'ECOMM',
    role: 'ECOMM_MANAGER',
    key: 'ecomm',
    title: 'E-commerce Menu',
    items: [
      { key: 'products-studio', label: 'Product Studio', caption: '', icon: 'ecomm', to: '/products/manage' },
    ],
  },
  // Club administration lives on the partner portal — the Earn card already
  // sends it there — so this role has no in-app studio: Withdrawal alone.
  { mode: 'CLUB', role: 'CLUB_ADMIN', key: 'club', title: 'Club Admin Menu', items: [] },
];

/**
 * The partner section for the studio mode the user is currently switched into,
 * ending in Withdrawal. Returns a list (never more than one entry) so the caller
 * renders it the same way whether or not a mode is active.
 *
 * Gated on the MODE, not merely the role: in User mode the drawer stays a
 * consumer drawer, and a partner sees exactly the one menu they switched to
 * rather than every menu they qualify for. The role is still checked because a
 * revoked role must not keep a persisted mode alive.
 */
export function buildPartnerMenus(roles: readonly string[], mode: StudioMode): PartnerMenu[] {
  const active = PARTNER_MENUS.find((menu) => menu.mode === mode && roles.includes(menu.role));
  if (!active) return [];
  return [
    { key: active.key, title: active.title, items: [...active.items, WITHDRAWAL_TILE] },
  ];
}

/** The "Shop" grouped list — the e-commerce destinations, a section that sits
 * parallel to Manage Account. Static (no flag gating), so a plain const. */
export const SHOP_ITEMS: readonly ProfileTile[] = [
  { key: 'shop', label: 'Pod Shop', caption: '', icon: 'shop', to: '/shop' },
  { key: 'orders', label: 'My Product Order History', caption: '', icon: 'orders', to: '/orders' },
  { key: 'addresses', label: 'Address Book', caption: '', icon: 'addresses', to: '/address-book' },
  { key: 'cart', label: 'Cart', caption: '', icon: 'cart', to: '/cart' },
];
