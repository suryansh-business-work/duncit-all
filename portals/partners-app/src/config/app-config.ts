import type { AppNavItem } from '@duncit/shell';
import { hasPartnerRole, PARTNER_SECTIONS, visibleSections, type PartnerSection } from './partner-sections';

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
    { label: 'FAQs', labelKey: 'shell.nav.faqs', to: '/faqs', icon: 'help' },
    { label: 'Support', labelKey: 'shell.nav.support', to: '/support', icon: 'support' },
    { label: 'Policies', labelKey: 'shell.nav.policies', to: '/policies', icon: 'policy' },
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

/** Wallet/Withdrawal is shown to partner roles that can earn payouts. */
const WALLET_NAV: AppNavItem = { label: 'Wallet', to: '/wallet', icon: 'wallet' };

const AUTO_PODS_LABEL = 'Auto Pods';
const AUTO_PODS_ICON = 'handshake';

/**
 * Adds a partner section's Auto Pods entry, directly AFTER its Dashboard child.
 *
 * Never first: `landingPath()` opens the first child of the user's first
 * section, so a first-position insert would silently move where `/` sends them.
 */
function withAutoPods(section: PartnerSection, enabled: boolean): AppNavItem {
  const { nav, autoPodsTo } = section;
  if (!enabled || !autoPodsTo) return nav;
  const children = nav.children ?? [];
  return {
    ...nav,
    children: [
      ...children.slice(0, 1),
      { label: AUTO_PODS_LABEL, to: autoPodsTo, icon: AUTO_PODS_ICON },
      ...children.slice(1),
    ],
  };
}

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
  /** The `auto_pods` feature flag. Off by default, so the three Auto Pod
   * entries stay hidden until an admin turns the feature on. */
  autoPods?: boolean;
  /** The `is_product_visible` system flag. Off by default, so the E-Commerce
   * Brand area — listings, warehouses, ShipRocket — is absent from the sidebar. */
  products?: boolean;
}

/**
 * Sidebar nav for the signed-in user: the partner sections they hold (in
 * catalogue order), Wallet when any of them can earn a payout, then the
 * role-independent tail. A section they were never granted is simply absent —
 * applying for one starts from Earn with Duncit, which closes the sidebar for
 * everyone.
 */
export function buildNav(
  roles?: readonly string[] | null,
  options?: Readonly<BuildNavOptions>,
): AppNavItem[] {
  const autoPods = options?.autoPods === true;
  const shown = visibleSections(roles, options?.products === true);
  const sections = shown.map((section) => withAutoPods(section, autoPods));
  // Wallet follows the ROLE, not the product switch: an e-commerce partner with
  // earnings already banked must still be able to withdraw them after the shop
  // is switched off.
  const earns = PARTNER_SECTIONS.some((section) => hasPartnerRole(roles, section.role));
  const wallet = earns ? [WALLET_NAV] : [];
  return [...sections, ...wallet, ...appConfig.nav];
}
