import type { AppNavItem } from '@duncit/shell';

/**
 * Onboarding routes the `is_product_visible` system flag owns — the e-commerce
 * brand console and its meeting queue. With the flag off the server refuses
 * every brand read, so these are hidden rather than left as dead links.
 */
const ECOMM_ROUTES = new Set(['/ecomm-brands', '/meetings/ecomm']);

/** Whether a nav route belongs to the e-commerce segment. */
export const isEcommRoute = (path: string): boolean => ECOMM_ROUTES.has(path);

/** The sidebar with its e-commerce entries dropped, groups included. */
export function withoutEcommNav(nav: AppNavItem[]): AppNavItem[] {
  return nav
    .filter((item) => !item.to || !isEcommRoute(item.to))
    .map((item) => (item.children ? { ...item, children: withoutEcommNav(item.children) } : item));
}
