import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

import type { MenuRoute } from '@/navigation/types';
import type { StudioMode } from '@/utils/studio-mode';

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

/** The 2×2 quick-action grid — the four primary consumer destinations. */
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
 * gates the Pod Plans row, `showTourGuide` the Tour Guide row. */
export function buildManageItems(showPodPlans: boolean, showTourGuide: boolean): ProfileTile[] {
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
  items.push({ key: 'faqs', label: 'FAQs', caption: '', icon: 'help-outline', route: 'Faqs' });
  if (showPodPlans) {
    // Pod Plans always slots in just before FAQs (the last row).
    items.splice(-1, 0, {
      key: 'plans',
      label: 'Pod Plans',
      caption: '',
      icon: 'category',
      route: 'PodPlans',
    });
  }
  return items;
}

/** One partner role's own grouped sidebar section. */
export interface PartnerMenu {
  key: string;
  title: string;
  items: ProfileTile[];
}

/** Withdrawal points at the one shared Wallet screen whichever role earned into
 * it, so every partner menu ends with this same row. A pure consumer holds none
 * of these roles, gets no menu, and therefore never sees Withdrawal. */
const WITHDRAWAL_TILE: ProfileTile = {
  key: 'withdrawal',
  label: 'Withdrawal',
  caption: 'Withdraw your earnings',
  icon: 'account-balance-wallet',
  route: 'Wallet',
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
      {
        key: 'host-studio',
        label: 'Host Studio',
        caption: '',
        icon: 'dashboard',
        route: 'HostManage',
      },
      {
        key: 'host-dashboard',
        label: 'Host Dashboard',
        caption: '',
        icon: 'insights',
        route: 'HostDashboard',
      },
    ],
  },
  {
    mode: 'VENUE',
    role: 'VENUE_OWNER',
    key: 'venue',
    title: 'Venue Menu',
    items: [
      {
        key: 'venue-studio',
        label: 'Venue Studio',
        caption: '',
        icon: 'store',
        route: 'VenueManage',
      },
      {
        key: 'venue-slot-requests',
        label: 'Slot Requests',
        caption: '',
        icon: 'event-available',
        route: 'VenueSlotRequests',
      },
      {
        key: 'venue-earnings',
        label: 'Venue Earnings',
        caption: '',
        icon: 'insights',
        route: 'VenueEarnings',
      },
    ],
  },
  {
    mode: 'ECOMM',
    role: 'ECOMM_MANAGER',
    key: 'ecomm',
    title: 'E-commerce Menu',
    items: [
      {
        key: 'products-studio',
        label: 'Product Studio',
        caption: '',
        icon: 'inventory-2',
        route: 'ProductsManage',
      },
    ],
  },
  {
    mode: 'CLUB',
    role: 'CLUB_ADMIN',
    key: 'club',
    title: 'Club Admin Menu',
    items: [
      {
        key: 'club-studio',
        label: 'Club Studio',
        caption: '',
        icon: 'groups',
        route: 'ClubManage',
      },
    ],
  },
];

/** The Auto Pods row each partner menu gains while the `auto_pods` flag is on.
 * Only the three enrolling roles have a queue, so ECOMM has no entry. The label
 * is passed in already translated — this module holds no copy. */
const AUTO_POD_TILES: Partial<Record<StudioMode, Omit<ProfileTile, 'label'>>> = {
  VENUE: { key: 'venue-auto-pods', caption: '', icon: 'auto-awesome', route: 'VenueAutoPods' },
  HOST: { key: 'host-auto-pods', caption: '', icon: 'auto-awesome', route: 'HostAutoPods' },
  CLUB: { key: 'club-auto-pods', caption: '', icon: 'auto-awesome', route: 'ClubAutoPods' },
};

/**
 * The partner section for the studio mode the user is currently switched into,
 * ending in Withdrawal. Returns a list (never more than one entry) so the caller
 * renders it the same way whether or not a mode is active.
 *
 * Gated on the MODE, not merely the role: in User mode the sidebar stays a
 * consumer sidebar, and a partner sees exactly the one menu they switched to
 * rather than every menu they qualify for. The role is still checked because a
 * revoked role must not keep a persisted mode alive.
 *
 * `autoPodLabel` opts the mode's Auto Pods row in: the caller passes the
 * translated label when the `auto_pods` flag is on, and nothing when it is off.
 */
export function buildPartnerMenus(
  roles: readonly string[],
  mode: StudioMode,
  autoPodLabel?: string,
): PartnerMenu[] {
  const active = PARTNER_MENUS.find((menu) => menu.mode === mode && roles.includes(menu.role));
  if (!active) return [];
  const items = [...active.items];
  const autoPods = AUTO_POD_TILES[mode];
  if (autoPodLabel && autoPods) {
    items.push({ ...autoPods, label: autoPodLabel });
  }
  return [{ key: active.key, title: active.title, items: [...items, WITHDRAWAL_TILE] }];
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
