import type { AppNavItem } from '@duncit/shell';
import {
  STUDIO_OPTIONS_ENTRY,
  studioOptionGroups,
  studioOptionsFor,
  type StudioOptionIcon,
  type StudioOptionItem,
} from '@duncit/utils';
import {
  activeSection,
  hasPartnerRole,
  optionsPathOf,
  PARTNER_SECTIONS,
  type PartnerRole,
  type PartnerSection,
} from './partner-sections';

/**
 * Per-app configuration for the Duncit Partners console. Reusable configuration
 * only — no dynamic business data. The `key` is the stable portal identifier
 * sent as `portal_key` on login and used by the shared shell.
 */
export type { AppNavItem } from '@duncit/shell';

export interface AppConfig {
  key: string;
  name: string;
  fullName: string;
  tokenKey: string;
  colorModeKey: string;
  requiredRoles: string[];
  nav: AppNavItem[];
}

export const appConfig: AppConfig = {
  key: 'partners',
  name: 'Partners',
  fullName: 'Duncit Partners',
  tokenKey: 'token',
  colorModeKey: 'partners_color_mode',
  // Partners is a portal-gate-exempt surface: any authenticated user may sign in
  // (e.g. to apply as a host). Access is per area instead — see partner-sections.ts.
  requiredRoles: [],
  // The role-independent tail of the sidebar. The four partner sections live in
  // partner-sections.ts, and buildNav() puts the ones the user holds above this.
  nav: [
    // Verification is not listed here: it is one of every studio's options (the
    // Options page and the studio menu beside each page), and its route stays.
    // FAQs, Support and Policies — one Help group (and one page with tabs).
    {
      label: 'Help',
      labelKey: 'shell.nav.help',
      icon: 'help',
      children: [
        { label: 'FAQs', labelKey: 'shell.nav.faqs', to: '/faqs', icon: 'help' },
        { label: 'Support', labelKey: 'shell.nav.support', to: '/support', icon: 'support' },
        { label: 'Policies', labelKey: 'shell.nav.policies', to: '/policies', icon: 'policy' },
      ],
    },
    // Gig Jobs: hosts, venue owners and brand owners post what an event needs;
    // freelancers apply. Every signed-in partner sees it, whatever role they hold.
    {
      label: 'Gig Jobs',
      labelKey: 'shell.nav.gigJobs',
      icon: 'work',
      children: [
        { label: 'Browse gigs', labelKey: 'shell.nav.browseGigs', to: '/gigs', icon: 'work' },
        { label: 'Post a gig', labelKey: 'shell.nav.postGig', to: '/gigs/new', icon: 'campaign' },
        { label: 'My gig posts', labelKey: 'shell.nav.myGigPosts', to: '/gigs/mine', icon: 'article' },
      ],
    },
    // Featured invitation into the other earn journeys — the same entry
    // mWeb/native show in their profile grids, styled as a highlighted card.
    // Last on purpose, and pinned to the sidebar's foot (just above the
    // signed-in user): it closes the sidebar for everyone, partner or not yet.
    {
      label: 'Earn with Duncit', labelKey: 'shell.nav.earnWithDuncit',
      caption: 'Host, list or sell', captionKey: 'shell.nav.hostListOrSell',
      to: '/earn',
      icon: 'volunteer-activism',
      featured: true,
      pinBottom: true,
    },
  ],
};

/**
 * Where `/` sends somebody: the Options page of the studio they are IN (see
 * useActiveStudio) — the breadcrumb's root crumb and the logo both link to `/`,
 * so "home" must never swap studios. A studio they do not hold, or none
 * remembered yet, falls back to the first partner area they hold.
 *
 * This surface is open to any signed-in user, and somebody with no partner
 * access yet lands on Earn with Duncit — the page that says how to get it, and
 * the one entry their sidebar shows besides the account pages.
 */
export function landingPath(
  roles?: readonly string[] | null,
  productsVisible = true,
  activeRole?: PartnerRole | null,
): string {
  const studio = activeSection(roles, productsVisible, activeRole);
  return studio ? optionsPathOf(studio) : '/earn';
}

export interface BuildNavOptions {
  /** The `is_product_visible` system flag. Off by default, so the Brand
   * Studio — listings, warehouses, ShipRocket — is absent. */
  products?: boolean;
  /** The studio the user is in (see useActiveStudio). Ignored when they do
   * not hold it; the first studio they hold is used instead. */
  activeRole?: PartnerRole | null;
  /** The `auto_pods` feature flag. Off by default, so a studio that lists its
   * options in the sidebar leaves Auto Pods out, as its Options page does. */
  autoPods?: boolean;
}

/** Withdrawal for a partner with no studio to show it (see buildNav). */
const WITHDRAWAL_NAV: AppNavItem = { label: 'Withdrawal', labelKey: 'shell.nav.withdrawal', to: '/wallet', icon: 'wallet' };

/**
 * A studio's ONE sidebar entry: its Options page, highlighted like Earn with
 * Duncit. Its words are the shared catalogue's keys; the shell always renders
 * `labelKey` / `captionKey`, so the key also stands in for the required
 * `label` rather than pinning English here.
 */
export function studioOptionsNavItem(section: PartnerSection): AppNavItem {
  const entry = STUDIO_OPTIONS_ENTRY[section.mode];
  return {
    label: entry.labelKey,
    labelKey: entry.labelKey,
    caption: entry.hintKey,
    captionKey: entry.hintKey,
    to: entry.portal,
    icon: section.icon,
    featured: true,
  };
}

/** The shell's glyph (an AppIcon name) for each option the catalogue names by meaning. */
const OPTION_NAV_ICON: Readonly<Record<StudioOptionIcon, string>> = {
  dashboard: 'dashboard',
  venue: 'storefront',
  pods: 'community',
  create: 'widgets',
  autopods: 'ai',
  calendar: 'calendar',
  availability: 'tune',
  settings: 'settings',
  earnings: 'payments',
  publish: 'language',
  change: 'compare',
  requests: 'host-request',
  nearby: 'location',
  verification: 'verified-user',
  wallet: 'wallet',
  clubs: 'groups',
  monitoring: 'insights',
  brands: 'marketplace',
  integrations: 'hub',
  returns: 'inventory',
  orders: 'orders',
  menu: 'menuBook',
  warehouses: 'warehouse',
  refunds: 'revenue',
  categories: 'widgets',
};

const optionNavItem = (option: StudioOptionItem): AppNavItem => ({
  label: option.labelKey,
  labelKey: option.labelKey,
  to: option.portal,
  icon: OPTION_NAV_ICON[option.icon],
});

/**
 * Under the Food group the word "Food" is already said, so its dashboard and
 * its menu read plainly there; everywhere else (the Options pages, where they
 * sit among the venue's other options) they keep their full names.
 */
const FOOD_NAV_LABEL_KEY: Readonly<Record<string, string>> = {
  'food-dashboard': 'shell.nav.dashboard',
  'food-menu': 'shell.nav.foodMenu',
};

function foodNavItem(option: StudioOptionItem): AppNavItem {
  const labelKey = FOOD_NAV_LABEL_KEY[option.key] ?? option.labelKey;
  return { ...optionNavItem(option), label: labelKey, labelKey };
}

/** A group's rows are keyed by label and selected by route, so a sibling that
 * repeats either is dropped — the first one listed stays. */
function uniqueSiblings(items: readonly AppNavItem[]): AppNavItem[] {
  return items.filter(
    (item, index) => items.findIndex((other) => other.label === item.label || other.to === item.to) === index,
  );
}

/** A sidebar category of the Venue Studio, and the options it holds, in the order it lists them. */
interface NavCategory {
  label: string;
  labelKey: string;
  icon: string;
  keys: readonly string[];
}

/**
 * The Venue Studio's options sorted into what a venue owner is doing: setting
 * the venue up, running its pods, answering requests, being paid. The Food
 * desk keeps its own group (the catalogue's `group: 'food'`), and Dashboard
 * sits on top with the Options page.
 */
const VENUE_TOP_KEYS: readonly string[] = ['dashboard', 'calendar'];
const VENUE_NAV_CATEGORIES: readonly NavCategory[] = [
  {
    label: 'Venues',
    labelKey: 'shell.nav.venues',
    icon: 'storefront',
    keys: ['venues', 'type-capacity', 'amenities', 'leaves', 'fees', 'price-rules', 'settings', 'publish', 'verification'],
  },
  { label: 'Pods', labelKey: 'shell.nav.pods', icon: 'community', keys: ['pods', 'rented-items'] },
  { label: 'Requests', labelKey: 'shell.nav.requests', icon: 'host-request', keys: ['slot-requests', 'pod-requests', 'change-requests', 'auto-pods', 'nearby'] },
  { label: 'Finance', labelKey: 'shell.nav.finance', icon: 'payments', keys: ['earnings', 'withdrawal'] },
];

const pick = (options: readonly StudioOptionItem[], keys: readonly string[]) =>
  keys.flatMap((key) => options.filter((option) => option.key === key));

/**
 * A `nestedNav` studio's sidebar: All options, Dashboard and Calendar on top, then every
 * other option under its category (collapsible), then the food desk. An option
 * no category names still shows — under Venues — so a new catalogue entry is
 * never dropped from the sidebar. Auto Pods follows its flag exactly as the
 * Options page does; an empty category, or a studio with no food desk, gets
 * no group.
 */
export function studioNestedNavItems(section: PartnerSection, autoPods: boolean): AppNavItem[] {
  const entry = STUDIO_OPTIONS_ENTRY[section.mode];
  const { main, food } = studioOptionGroups(studioOptionsFor(section.mode, [section.role], { autoPods, console: true }));
  const allOptions: AppNavItem = { label: 'All options', labelKey: 'shell.nav.allOptions', to: entry.portal, icon: 'widgets' };
  const named = new Set([...VENUE_TOP_KEYS, ...VENUE_NAV_CATEGORIES.flatMap((category) => category.keys)]);
  const unnamed = main.filter((option) => !named.has(option.key));
  const top = uniqueSiblings([allOptions, ...pick(main, VENUE_TOP_KEYS).map(optionNavItem)]);
  const groups: AppNavItem[] = VENUE_NAV_CATEGORIES.map((category, index) => ({
    label: category.label,
    labelKey: category.labelKey,
    icon: category.icon,
    children: uniqueSiblings([...pick(main, category.keys), ...(index === 0 ? unnamed : [])].map(optionNavItem)),
  })).filter((group) => group.children.length > 0);
  if (food.length > 0) {
    groups.splice(groups.length - 1, 0, {
      label: 'Food',
      labelKey: 'shell.nav.food',
      icon: 'menuBook',
      children: uniqueSiblings(food.map(foodNavItem)),
    });
  }
  return [...top, ...groups];
}

/** What the studio the user is in puts in the sidebar: its ONE Options entry,
 * or — for a `nestedNav` studio — its options under their groups. */
function studioNav(section: PartnerSection, autoPods: boolean): AppNavItem[] {
  return section.nestedNav ? studioNestedNavItems(section, autoPods) : [studioOptionsNavItem(section)];
}

/**
 * Sidebar nav for the signed-in user: ONE studio at a time — its Options entry,
 * which opens the page listing every option the studio has (the Venue Studio
 * lists its options under categories instead, see studioNestedNavItems) — then
 * the role-independent tail. The studio switcher above it moves between studios.
 *
 * Somebody who holds no studio yet sees the ways in instead (Be a Host, become
 * a Brand partner), so the sidebar still says what this console is for.
 */
export function buildNav(
  roles?: readonly string[] | null,
  options?: Readonly<BuildNavOptions>,
): AppNavItem[] {
  const products = options?.products === true;
  const active = activeSection(roles, products, options?.activeRole);
  const studio = active
    ? studioNav(active, options?.autoPods === true)
    : PARTNER_SECTIONS.filter((section) => products || !section.products)
        .map((section) => section.onboarding)
        .filter((item): item is AppNavItem => item !== undefined);
  // Withdrawal is on every studio's Options page. A partner whose only studio
  // is hidden (the shop switched off) holds no studio to show it — but money
  // they already earned must stay withdrawable, so it follows the ROLE here.
  const earns = PARTNER_SECTIONS.some((section) => hasPartnerRole(roles, section.role));
  const withdrawal = !active && earns ? [WITHDRAWAL_NAV] : [];
  return [...studio, ...withdrawal, ...appConfig.nav];
}
