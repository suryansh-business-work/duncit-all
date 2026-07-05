import type { AppNavItem } from '../../types';

/** True when `to` is the current pathname, or a prefix segment of it. */
export const matches = (pathname: string, to?: string): boolean => {
  if (!to) return false;
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
};

/** True when any descendant of `item` matches the current pathname. */
export const groupActive = (pathname: string, item: AppNavItem): boolean =>
  Boolean(item.children?.some((child) => matches(pathname, child.to) || groupActive(pathname, child)));

/**
 * Returns the child whose `to` is the longest prefix of pathname, or null.
 *
 * Used to disambiguate sibling leaves: `/host-leads` vs `/host-leads/services`
 * both prefix-match for `/host-leads/services`, but only the latter is the
 * "real" selection — this returns the latter so the parent leaf isn't
 * highlighted alongside the actual destination.
 */
export function bestChild(pathname: string, children: AppNavItem[]): AppNavItem | null {
  let winner: AppNavItem | null = null;
  let winnerLen = -1;
  for (const child of children) {
    if (!child.to) continue;
    if (!matches(pathname, child.to)) continue;
    if (child.to.length > winnerLen) {
      winner = child;
      winnerLen = child.to.length;
    }
  }
  return winner;
}

/** Filter nav by query: keep a group if its label matches (whole subtree) or any descendant matches. */
export function filterNav(items: AppNavItem[], q: string): AppNavItem[] {
  if (!q) return items;
  const ql = q.toLowerCase();
  return items.flatMap((item) => {
    if (item.label.toLowerCase().includes(ql)) return [item];
    const kids = filterNav(item.children ?? [], ql);
    return kids.length ? [{ ...item, children: kids }] : [];
  });
}
