import type { AppNavItem } from '@duncit/shell';
import { STUDIO_OPTIONS_ENTRY } from '@duncit/utils';
import {
  activeSection,
  hasPartnerRole,
  optionsPathOf,
  PARTNER_SECTIONS,
  visibleSections,
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
    // Featured invitation into the other earn journeys — the same entry
    // mWeb/native show in their profile grids, styled as a highlighted card.
    // Last on purpose: it closes the sidebar for everyone, partner or not yet.
    {
      label: 'Earn with Duncit', labelKey: 'shell.nav.earnWithDuncit',
      caption: 'Host, list or sell', captionKey: 'shell.nav.hostListOrSell',
      to: '/earn',
      icon: 'volunteer-activism',
      featured: true,
    },
  ],
};

/**
 * Where `/` sends somebody: the Options page of the first partner area they hold.
 *
 * This surface is open to any signed-in user, and somebody with no partner
 * access yet lands on Earn with Duncit — the page that says how to get it, and
 * the one entry their sidebar shows besides the account pages.
 */
export function landingPath(roles?: readonly string[] | null, productsVisible = true): string {
  const first = visibleSections(roles, productsVisible)[0];
  return first ? optionsPathOf(first) : '/earn';
}

export interface BuildNavOptions {
  /** The `is_product_visible` system flag. Off by default, so the Brand
   * Studio — listings, warehouses, ShipRocket — is absent. */
  products?: boolean;
  /** The studio the user is in (see useActiveStudio). Ignored when they do
   * not hold it; the first studio they hold is used instead. */
  activeRole?: PartnerRole | null;
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

/**
 * Sidebar nav for the signed-in user: ONE studio at a time — its Options entry,
 * which opens the page listing every option the studio has — then the
 * role-independent tail. The studio switcher above it moves between studios.
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
    ? [studioOptionsNavItem(active)]
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
