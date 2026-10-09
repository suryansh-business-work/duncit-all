import type { AppNavItem } from '@duncit/shell';
import { STUDIO_OPTIONS_ENTRY, type PartnerStudioMode } from '@duncit/utils';

/**
 * The four partner areas of this console. Each is an access the Onboarding
 * portal (on an approved application) or the Admin portal grants as a role, so
 * holding the role is the only thing that lets an area's ROUTES render, and the
 * only thing that puts its own entry in the sidebar.
 *
 * Two of them (Host, E-Commerce Brand) also keep a sidebar entry for somebody
 * who holds no role yet — see `onboarding` — because being invited in is the
 * point of this console for a not-yet-partner. Order here is sidebar order —
 * and, via `landingPath()`, which area `/` opens for somebody who holds more
 * than one.
 */
export type PartnerRole =
  | 'CLUB_ADMIN'
  | 'VENUE_OWNER'
  | 'HOST'
  | 'ECOMM_MANAGER';

export interface PartnerSection {
  role: PartnerRole;
  /** The same studio in the shared catalogue's terms (@duncit/utils
   * studio-options): it names the studio's Options page and its options. */
  mode: PartnerStudioMode;
  /** The icon of the studio's ONE sidebar entry, its Options page. */
  icon: string;
  /** True for an area the `is_product_visible` system flag owns — with the flag
   * off it is not in the sidebar, its routes do not render, and `/` never lands
   * on it. E-Commerce Brand is the whole of it: listings, warehouses (ShipRocket
   * registration) and the brand dashboard. */
  products?: boolean;
  /** Route prefixes that belong to the area; `SectionGate` keeps them to the role. */
  paths: readonly string[];
  /**
   * The ONE entry the sidebar shows to somebody who does not hold the role yet.
   *
   * A section without it is simply absent until it is granted (Club Admin and
   * Venue Owner are reached from Earn with Duncit). Host and E-Commerce Brand
   * keep an entry either way, so the way IN is where the area itself is — the
   * entry opens the matching Earn with Duncit journey, not a dashboard with no
   * data behind it.
   */
  onboarding?: AppNavItem;
}

export const PARTNER_SECTIONS: readonly PartnerSection[] = [
  // Regional Club Admin used to be the first section here. It is its own
  // console now (regional-club-admin.duncit.com), because it was the one area
  // with no onboarding journey behind it: the role is an internal appointment
  // the Admin portal grants, not a partner application.
  //
  // What each studio offers is the shared catalogue (@duncit/utils
  // studio-options) that mWeb and the native app list too; the sidebar shows
  // ONE entry per studio, its Options page, and every option keeps its route.
  { role: 'CLUB_ADMIN', mode: 'CLUB', icon: 'groups', paths: ['/club-admin'] },
  { role: 'VENUE_OWNER', mode: 'VENUE', icon: 'storefront', paths: ['/venues', '/register-venue'] },
  {
    role: 'HOST',
    mode: 'HOST',
    icon: 'work',
    paths: ['/host'],
    // Deliberately NOT `/become-host`: that is the application FORM, the half
    // of hosting that follows the onboarding meeting. The way in is the journey.
    onboarding: { label: 'Be a Host', labelKey: 'shell.nav.beAHost', to: '/be-a-host', icon: 'volunteer-activism' },
  },
  {
    role: 'ECOMM_MANAGER',
    mode: 'ECOMM',
    icon: 'marketplace',
    products: true,
    paths: ['/ecomm', '/ecomm-brand'],
    onboarding: {
      label: 'Become an E-Commerce Brand Partner',
      labelKey: 'shell.nav.becomeAnECommerceBrandPartner',
      to: '/become-a-brand-partner',
      icon: 'volunteer-activism',
    },
  },
];

export const hasPartnerRole = (roles: readonly string[] | null | undefined, role: PartnerRole): boolean =>
  roles?.includes(role) ?? false;

const underPath = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Where a studio opens — its Options page. `/` and the switcher land there. */
export const optionsPathOf = (section: PartnerSection): string => STUDIO_OPTIONS_ENTRY[section.mode].portal;

/** The section a role names, or `null`. */
export function sectionByRole(role: string | null | undefined): PartnerSection | null {
  return PARTNER_SECTIONS.find((entry) => entry.role === role) ?? null;
}

/** The section a route belongs to, or `null` for the pages every signed-in user may open. */
export function sectionFor(pathname: string): PartnerSection | null {
  return PARTNER_SECTIONS.find((entry) => entry.paths.some((prefix) => underPath(pathname, prefix))) ?? null;
}

/** The role a route needs, or `null` for the pages every signed-in user may open. */
export function sectionRoleFor(pathname: string): PartnerRole | null {
  return sectionFor(pathname)?.role ?? null;
}

/** The partner areas a user may see: the ones they hold a role for, minus the
 * product area while the system flag is off. */
export function visibleSections(
  roles: readonly string[] | null | undefined,
  productsVisible: boolean,
): PartnerSection[] {
  return PARTNER_SECTIONS.filter(
    (section) => hasPartnerRole(roles, section.role) && (productsVisible || !section.products),
  );
}
