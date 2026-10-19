/**
 * The account menu (/menu) — one catalogue mWeb and the native app both draw,
 * so the two cannot list different destinations, gate them on different flags
 * or group them differently (rule 56).
 *
 * Framework-free: every word is a translation KEY, and the destination itself
 * (an mWeb path, a native route) and its icon stay with each app, keyed by
 * {@link ProfileMenuKey}.
 *
 * Two things are built from it:
 *  - the Quick Access grid — {@link QUICK_ACCESS_SIZE} tiles the member picks
 *    and orders, kept per device ({@link normaliseQuickAccess} reads it back);
 *  - the collapsible section cards ({@link profileMenuSections}).
 */

/** Every destination the account menu can open. */
export type ProfileMenuKey =
  | 'chats'
  | 'following'
  | 'pod-history'
  | 'earn'
  | 'ideas'
  | 'support'
  | 'help'
  | 'faqs'
  | 'leaderboard'
  | 'badges'
  | 'gigs'
  | 'referral'
  | 'membership'
  | 'shop'
  | 'cart'
  | 'food-orders'
  | 'gift-cards-buy'
  | 'gift-cards-redeem'
  | 'orders'
  | 'addresses'
  | 'rentals'
  | 'account'
  | 'saved'
  | 'contacts'
  | 'verification'
  | 'tour'
  | 'plans';

/** The server feature flags a menu destination can ride on. `products` is the
 * `is_product_visible` system flag. */
export type ProfileMenuFlag =
  | 'pod_plans_section'
  | 'leaderboard'
  | 'membership'
  | 'gift_cards'
  | 'tour_guide'
  | 'products';

/** Which flags are on. A flag left out counts as off. */
export type ProfileMenuFlags = Readonly<Partial<Record<ProfileMenuFlag, boolean>>>;

export interface ProfileMenuItem {
  key: ProfileMenuKey;
  /** The row's or tile's own label. */
  labelKey: string;
  /** Hidden while this flag is off. */
  flag?: ProfileMenuFlag;
  /** A small pill after the label (Membership's "Coming soon"). */
  badgeKey?: string;
  /** What the section subtitle calls it, when that is shorter than the label —
   * two rows naming the same thing ("Buy a gift card", "Redeem a gift card")
   * share one, and the subtitle says it once. */
  subtitleKey?: string;
}

/** The whole catalogue, keyed — the one place a destination's copy lives. */
export const PROFILE_MENU_ITEMS: Readonly<Record<ProfileMenuKey, ProfileMenuItem>> = {
  chats: { key: 'chats', labelKey: 'mweb.nav.chats' },
  following: { key: 'following', labelKey: 'mweb.nav.following' },
  'pod-history': { key: 'pod-history', labelKey: 'mweb.podHistory.title' },
  earn: { key: 'earn', labelKey: 'mweb.sidebar.earnWithDuncit' },
  ideas: { key: 'ideas', labelKey: 'mweb.podIdeas.podIdeas' },
  support: { key: 'support', labelKey: 'mweb.sidebar.helpSupport' },
  help: { key: 'help', labelKey: 'mweb.sidebar.help' },
  faqs: { key: 'faqs', labelKey: 'mweb.sidebar.faqs' },
  leaderboard: {
    key: 'leaderboard',
    labelKey: 'mweb.leaderboard.sidebarLabel',
    flag: 'leaderboard',
    subtitleKey: 'mweb.leaderboard.title',
  },
  badges: { key: 'badges', labelKey: 'mweb.badges.sidebarLabel' },
  gigs: { key: 'gigs', labelKey: 'gigJobs.nav.label' },
  referral: { key: 'referral', labelKey: 'mweb.referral.title' },
  membership: {
    key: 'membership',
    labelKey: 'mweb.membership.sidebarLabel',
    flag: 'membership',
    badgeKey: 'mweb.membership.comingSoon',
    subtitleKey: 'mweb.membership.title',
  },
  shop: { key: 'shop', labelKey: 'mweb.shop.title', flag: 'products' },
  cart: { key: 'cart', labelKey: 'mweb.nav.cart', flag: 'products' },
  'food-orders': {
    key: 'food-orders',
    labelKey: 'mweb.venueFood.myOrders.sidebarLabel',
    subtitleKey: 'mweb.venueFood.myOrders.sidebarTitle',
  },
  'gift-cards-buy': {
    key: 'gift-cards-buy',
    labelKey: 'mweb.giftCards.sidebarBuyLabel',
    flag: 'gift_cards',
    subtitleKey: 'mweb.giftCards.title',
  },
  'gift-cards-redeem': {
    key: 'gift-cards-redeem',
    labelKey: 'mweb.giftCards.sidebarRedeemLabel',
    flag: 'gift_cards',
    subtitleKey: 'mweb.giftCards.title',
  },
  orders: { key: 'orders', labelKey: 'mweb.sidebar.productOrders', flag: 'products' },
  addresses: { key: 'addresses', labelKey: 'mweb.addressBook.addressBook', flag: 'products' },
  // Rented items ride on pod bookings, not on the product shop — no flag.
  rentals: { key: 'rentals', labelKey: 'venueRentals.guest.sidebarLabel' },
  account: { key: 'account', labelKey: 'mweb.common.manageAccount' },
  saved: { key: 'saved', labelKey: 'mweb.saved.savedItems' },
  contacts: { key: 'contacts', labelKey: 'mweb.contacts.sidebarLabel', subtitleKey: 'mweb.sidebar.contacts' },
  verification: { key: 'verification', labelKey: 'mweb.common.verification' },
  tour: { key: 'tour', labelKey: 'mweb.tourGuide.tourGuide', flag: 'tour_guide' },
  plans: { key: 'plans', labelKey: 'mweb.podPlans.podPlans', flag: 'pod_plans_section' },
};

/** True while the destination's flag (if it has one) is on. */
export function isProfileMenuItemVisible(key: ProfileMenuKey, flags: ProfileMenuFlags): boolean {
  const { flag } = PROFILE_MENU_ITEMS[key];
  return flag === undefined || flags[flag] === true;
}

// ── Quick Access ────────────────────────────────────────────────────────────

/** How many tiles the Quick Access grid holds — two rows of three. */
export const QUICK_ACCESS_SIZE = 6;

/** Where each app keeps the member's pick on the device. */
export const QUICK_ACCESS_STORAGE_KEY = 'duncit.quick_access';

/** The destinations a member may pin to Quick Access, in the order the editor
 * lists them. Section-only rows (Help, Verification, the gift-card pair …) stay
 * out: each is either a duplicate of a tile or a rare errand. */
export const QUICK_ACCESS_CATALOGUE: readonly ProfileMenuKey[] = [
  'chats',
  'following',
  'pod-history',
  'earn',
  'ideas',
  'support',
  'saved',
  'referral',
  'gigs',
  'leaderboard',
  'badges',
  'faqs',
  'food-orders',
  'shop',
  'cart',
  'contacts',
  'account',
];

/** The grid a member sees until they edit it. */
export const DEFAULT_QUICK_ACCESS: readonly ProfileMenuKey[] = [
  'chats',
  'following',
  'pod-history',
  'earn',
  'ideas',
  'support',
];

const QUICK_ACCESS_SET: ReadonlySet<string> = new Set(QUICK_ACCESS_CATALOGUE);

function isQuickAccessKey(value: unknown): value is ProfileMenuKey {
  return typeof value === 'string' && QUICK_ACCESS_SET.has(value);
}

/** The catalogue entries the member can pick right now — a flag-gated one
 * (Leaderboard, Pod Shop, Cart) only while its flag is on. */
export function availableQuickAccess(flags: ProfileMenuFlags): ProfileMenuKey[] {
  return QUICK_ACCESS_CATALOGUE.filter((key) => isProfileMenuItemVisible(key, flags));
}

/**
 * Whether a pick may be saved as is: exactly {@link QUICK_ACCESS_SIZE}
 * destinations, none twice, each one pickable under `flags`. The editors'
 * form schemas refine on this, so both apps refuse the same picks.
 */
export function isValidQuickAccess(selection: readonly unknown[], flags: ProfileMenuFlags): boolean {
  if (selection.length !== QUICK_ACCESS_SIZE) return false;
  if (new Set(selection).size !== selection.length) return false;
  return selection.every((key) => isQuickAccessKey(key) && isProfileMenuItemVisible(key, flags));
}

/**
 * The grid to draw from whatever the device had stored — which may be nothing,
 * an older catalogue's keys, a hand-edited value or another app's JSON.
 *
 * Kept: the stored keys that are still pickable, in the stored order, once
 * each. Then topped up to {@link QUICK_ACCESS_SIZE} from the default set —
 * whose tiles ride on no flag — so a flag switching off never leaves a hole in
 * the grid. Anything that is not an array reads as "never edited".
 */
export function normaliseQuickAccess(stored: unknown, flags: ProfileMenuFlags): ProfileMenuKey[] {
  const available = new Set(availableQuickAccess(flags));
  const picked: ProfileMenuKey[] = [];
  const take = (key: unknown) => {
    if (picked.length >= QUICK_ACCESS_SIZE) return;
    if (!isQuickAccessKey(key) || !available.has(key) || picked.includes(key)) return;
    picked.push(key);
  };
  if (Array.isArray(stored)) stored.forEach(take);
  DEFAULT_QUICK_ACCESS.forEach(take);
  return picked;
}

/** The editor's list: the picked tiles first, in grid order, then every other
 * pickable destination in catalogue order. */
export function quickAccessEditorRows(selection: readonly ProfileMenuKey[], flags: ProfileMenuFlags): ProfileMenuKey[] {
  const rest = availableQuickAccess(flags).filter((key) => !selection.includes(key));
  return [...selection, ...rest];
}

/** Picks or unpicks a destination in the editor. A pick past
 * {@link QUICK_ACCESS_SIZE} is refused (the same list comes back). */
export function toggleQuickAccess(selection: readonly ProfileMenuKey[], key: ProfileMenuKey): ProfileMenuKey[] {
  if (selection.includes(key)) return selection.filter((picked) => picked !== key);
  if (selection.length >= QUICK_ACCESS_SIZE) return [...selection];
  return [...selection, key];
}

/** Moves the picked tile at `index` one place up (`-1`) or down (`1`). A move
 * off either end, or from an index that is not there, changes nothing. */
export function moveQuickAccess(selection: readonly ProfileMenuKey[], index: number, step: -1 | 1): ProfileMenuKey[] {
  const target = index + step;
  const next = [...selection];
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Reads a stored Quick Access value (a JSON string, or nothing) back into the
 * grid. A value that does not parse counts as never edited. */
export function parseStoredQuickAccess(raw: string | null | undefined, flags: ProfileMenuFlags): ProfileMenuKey[] {
  if (!raw) return normaliseQuickAccess(null, flags);
  try {
    return normaliseQuickAccess(JSON.parse(raw), flags);
  } catch {
    // A corrupt value is the same as no value: the default grid.
    return normaliseQuickAccess(null, flags);
  }
}

// ── Section cards ───────────────────────────────────────────────────────────

export type ProfileMenuSectionId = 'explore' | 'work' | 'shopping' | 'account' | 'support';

export interface ProfileMenuSectionDef {
  id: ProfileMenuSectionId;
  titleKey: string;
  items: readonly ProfileMenuKey[];
}

/** The collapsible section cards, top to bottom. Rows that are not a
 * destination (Switch role, Dark mode, the Policies list) are added by each app
 * at the end of their section. */
export const PROFILE_MENU_SECTIONS: readonly ProfileMenuSectionDef[] = [
  { id: 'explore', titleKey: 'mweb.sidebar.sectionExplore', items: ['ideas', 'leaderboard', 'badges'] },
  { id: 'work', titleKey: 'mweb.sidebar.sectionWork', items: ['gigs', 'referral', 'membership'] },
  {
    id: 'shopping',
    titleKey: 'mweb.sidebar.sectionShopping',
    items: ['shop', 'cart', 'food-orders', 'gift-cards-buy', 'gift-cards-redeem', 'orders', 'addresses', 'rentals'],
  },
  {
    id: 'account',
    titleKey: 'mweb.sidebar.sectionAccount',
    items: ['account', 'saved', 'contacts', 'verification', 'tour', 'plans'],
  },
  { id: 'support', titleKey: 'mweb.sidebar.sectionSupport', items: ['help', 'faqs'] },
];

export interface ProfileMenuSection {
  id: ProfileMenuSectionId;
  titleKey: string;
  /** Only the rows whose flag is on, in section order. */
  items: ProfileMenuItem[];
}

export interface ProfileMenuSectionsOptions {
  /** Sections an app fills with rows of its own (Account's Switch role and
   * Dark mode) — kept even with every catalogue row hidden. */
  extraRows?: readonly ProfileMenuSectionId[];
  /** The definitions to build from — {@link PROFILE_MENU_SECTIONS} by default. */
  sections?: readonly ProfileMenuSectionDef[];
}

/**
 * The section cards to draw under `flags`: each one's visible rows, and a
 * section with none at all is left out (unless named in `extraRows`).
 */
export function profileMenuSections(
  flags: ProfileMenuFlags,
  { extraRows = [], sections = PROFILE_MENU_SECTIONS }: ProfileMenuSectionsOptions = {},
): ProfileMenuSection[] {
  return sections.map((section) => ({
    id: section.id,
    titleKey: section.titleKey,
    items: section.items
      .filter((key) => isProfileMenuItemVisible(key, flags))
      .map((key) => PROFILE_MENU_ITEMS[key]),
  })).filter((section) => section.items.length > 0 || extraRows.includes(section.id));
}

/** The keys the one-line subtitle under a section title lists — each visible
 * row's short name, a shared one (the gift-card pair) said once. */
export function profileSectionSubtitleKeys(items: readonly ProfileMenuItem[]): string[] {
  const keys = items.map((item) => item.subtitleKey ?? item.labelKey);
  return [...new Set(keys)];
}
