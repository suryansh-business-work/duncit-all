import type { AppNavItem } from '@duncit/shell';
import { AUTO_POD_PATHS, hasPartnerRole, PARTNER_SECTIONS, visibleSections, type PartnerRole } from './partner-sections';

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
    // Account-level — same section as mWeb/native's Manage Account list, which
    // also places it right before FAQs.
    { label: 'Verification', labelKey: 'shell.nav.verification', to: '/verification', icon: 'verified-user' },
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
 * Where `/` sends somebody: the dashboard of the first partner area they hold.
 *
 * This surface is open to any signed-in user, and somebody with no partner
 * access yet lands on Earn with Duncit — the page that says how to get it, and
 * the one entry their sidebar shows besides the account pages.
 */
export function landingPath(roles?: readonly string[] | null, productsVisible = true): string {
  const first = visibleSections(roles, productsVisible)[0];
  return first?.nav.children?.[0]?.to ?? '/earn';
}

export interface BuildNavOptions {
  /** The `auto_pods` feature flag. Off by default, so the Auto Pods options
   * stay out of the menu until an admin turns the feature on. */
  autoPods?: boolean;
  /** The `is_product_visible` system flag. Off by default, so the Brand
   * Studio — listings, warehouses, ShipRocket — is absent. */
  products?: boolean;
  /** The studio the user is in (see useActiveStudio). Ignored when they do
   * not hold it; the first studio they hold is used instead. */
  activeRole?: PartnerRole | null;
}

/** Withdrawal for a partner with no studio to show it (see buildNav). */
const WITHDRAWAL_NAV: AppNavItem = { label: 'Withdrawal', labelKey: 'shell.nav.withdrawal', to: '/wallet', icon: 'wallet' };

/** A nav tree without the Auto Pods options (the `auto_pods` flag is off). */
function withoutAutoPods(items: readonly AppNavItem[]): AppNavItem[] {
  return items
    .filter((item) => !(item.to && AUTO_POD_PATHS.includes(item.to)))
    .map((item) => (item.children ? { ...item, children: withoutAutoPods(item.children) } : item));
}

/**
 * Sidebar nav for the signed-in user: ONE studio at a time — Dashboard, Pods,
 * Requests, Withdrawal and every option grouped under them — then the
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
  const autoPods = options?.autoPods === true;
  const held = visibleSections(roles, products);
  const active = held.find((section) => section.role === options?.activeRole) ?? held[0];
  const studio = active
    ? (active.nav.children ?? [])
    : PARTNER_SECTIONS.filter((section) => products || !section.products)
        .map((section) => section.onboarding)
        .filter((item): item is AppNavItem => item !== undefined);
  // Withdrawal is in every studio's own list. A partner whose only studio is
  // hidden (the shop switched off) holds no studio to show it — but money they
  // already earned must stay withdrawable, so it follows the ROLE here.
  const earns = PARTNER_SECTIONS.some((section) => hasPartnerRole(roles, section.role));
  const withdrawal = !active && earns ? [WITHDRAWAL_NAV] : [];
  return [...(autoPods ? studio : withoutAutoPods(studio)), ...withdrawal, ...appConfig.nav];
}
