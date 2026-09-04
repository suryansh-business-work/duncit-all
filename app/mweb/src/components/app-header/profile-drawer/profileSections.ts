import type { StudioMode } from '../../../studio-mode';

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
  | 'host'
  | 'venue'
  | 'ecomm'
  | 'insights'
  | 'calendar'
  | 'availability'
  | 'settings'
  | 'autopods'
  | 'dashboard'
  | 'monitoring';

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
 * gates the Pod Plans row, `showTourGuide` the Tour Guide row. `badgesLabel`
 * arrives already translated — this module holds no copy for new rows (rule 38).
 */
export function buildManageItems(
  showPodPlans: boolean,
  showTourGuide: boolean,
  badgesLabel: string
): ProfileTile[] {
  const items: ProfileTile[] = [
    { key: 'account', label: 'Manage Account', caption: '', icon: 'account', to: '/account' },
    { key: 'saved', label: 'Saved Items', caption: '', icon: 'saved', to: '/saved' },
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
  {
    mode: 'CLUB',
    role: 'CLUB_ADMIN',
    key: 'club',
    title: 'Club Admin Menu',
    // Club Studio is the in-app home this role finally has; Withdrawal is
    // appended below like every other partner menu.
    items: [
      { key: 'club-studio', label: 'Club Studio', caption: '', icon: 'host', to: '/clubs/manage' },
    ],
  },
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
export function buildPartnerMenus(
  roles: readonly string[],
  mode: StudioMode,
  autoPods?: ProfileTile | null,
  extraItems: readonly ProfileTile[] = []
): PartnerMenu[] {
  const active = PARTNER_MENUS.find((menu) => menu.mode === mode && roles.includes(menu.role));
  if (!active) return [];
  // Rows the caller builds with translated labels (the venue calendar pair)
  // follow the mode's own rows — this module holds no copy for them (rule 38).
  const items = [...active.items, ...extraItems];
  // Auto Pods sits above Withdrawal: it is work waiting on the partner, and the
  // caller only passes it when the `auto_pods` flag is on for a role that has a
  // queue. Its label arrives translated — this module holds no copy (rule 38).
  if (autoPods) items.push(autoPods);
  items.push(WITHDRAWAL_TILE);
  return [{ key: active.key, title: active.title, items }];
}

/** The "Shop" grouped list — the e-commerce destinations, a section that sits
 * parallel to Manage Account. Static (no flag gating), so a plain const. */
export const SHOP_ITEMS: readonly ProfileTile[] = [
  { key: 'shop', label: 'Pod Shop', caption: '', icon: 'shop', to: '/shop' },
  { key: 'orders', label: 'My Product Order History', caption: '', icon: 'orders', to: '/orders' },
  { key: 'addresses', label: 'Address Book', caption: '', icon: 'addresses', to: '/address-book' },
  { key: 'cart', label: 'Cart', caption: '', icon: 'cart', to: '/cart' },
];
