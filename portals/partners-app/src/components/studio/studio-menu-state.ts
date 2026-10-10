import { STUDIO_OPTIONS_ENTRY, type StudioOptionItem } from '@duncit/utils';
import { sectionFor, underPath, type PartnerSection } from '../../config/partner-sections';

/** Where "the studio menu is minimised" is remembered, per browser. */
export const STUDIO_MENU_COLLAPSED_KEY = 'partners_studio_menu_collapsed';

/** The partner's own choice, or `null` when they have never made one. */
export function readStudioMenuCollapsed(): boolean | null {
  try {
    const stored = globalThis.localStorage?.getItem(STUDIO_MENU_COLLAPSED_KEY);
    if (stored === '1') return true;
    return stored === '0' ? false : null;
  } catch {
    // Storage blocked (private window, disabled site data): the menu simply
    // opens at its default for the screen size, every time.
    return null;
  }
}

export function writeStudioMenuCollapsed(collapsed: boolean) {
  try {
    globalThis.localStorage?.setItem(STUDIO_MENU_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    // Same as above — remembering the choice is a convenience, never required.
  }
}

/** An option's console destination, split into its path and its query (`?new=1`). */
const destinationOf = (option: StudioOptionItem) => {
  const [path = '', query = ''] = option.portal.split('?');
  return { path, query };
};

/**
 * The option the open page belongs to: the one whose path is the deepest that
 * still contains the route, so `/ecomm-brand/orders/42` is Orders rather than
 * Your brands. An option that also names a query (Create pod → `?new=1`) wins
 * only while that query is in the address.
 */
export function activeStudioOption(
  options: readonly StudioOptionItem[],
  pathname: string,
  search: string,
): StudioOptionItem | null {
  let best: StudioOptionItem | null = null;
  let bestRank = -1;
  for (const option of options) {
    const { path, query } = destinationOf(option);
    const applies = underPath(pathname, path) && (query === '' || search.includes(query));
    // Depth first; at the same depth the option that names the query is the more exact one.
    const rank = path.length * 2 + (query === '' ? 0 : 1);
    if (applies && rank > bestRank) {
      best = option;
      bestRank = rank;
    }
  }
  return best;
}

/**
 * Whether the studio menu sits beside this page. It does on every page of the
 * studio and on the pages its options open (Withdrawal, Verification — account
 * pages that belong to no studio). It does not on the Options page itself,
 * which IS the menu written out in full, nor on pages outside the studio.
 */
export function showsStudioMenu(
  section: PartnerSection,
  options: readonly StudioOptionItem[],
  pathname: string,
): boolean {
  if (options.length === 0 || pathname === STUDIO_OPTIONS_ENTRY[section.mode].portal) return false;
  if (sectionFor(pathname)?.role === section.role) return true;
  return options.some((option) => destinationOf(option).path === pathname);
}
