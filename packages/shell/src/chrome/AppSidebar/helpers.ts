import type { AppNavItem, NavBadge } from '../../types';

/** Past this a nav badge reads "99+", so the pill stays narrow. */
export const NAV_BADGE_MAX = 99;

/** A nav badge's visible count, capped. */
export const navBadgeText = (count: number): string => (count > NAV_BADGE_MAX ? `${NAV_BADGE_MAX}+` : String(count));

/** True when a badge has something to show. */
export const hasNavBadge = (badge?: NavBadge | null): badge is NavBadge => !!badge && badge.count > 0;

/**
 * The badge an entry shows: a leaf's own, or — for a group — the sum of every
 * badge under it, its labels joined, so waiting work still shows while the
 * group is closed. `null` when there is nothing waiting.
 */
export function navBadgeOf(item: AppNavItem): NavBadge | null {
  if (!item.children?.length) return hasNavBadge(item.badge) ? item.badge : null;
  const badges = item.children.map(navBadgeOf).filter(hasNavBadge);
  if (badges.length === 0) return null;
  const labels = badges.flatMap((badge) => (badge.label ? [badge.label] : []));
  return {
    count: badges.reduce((sum, badge) => sum + badge.count, 0),
    ...(labels.length > 0 ? { label: labels.join(', ') } : {}),
  };
}

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

/** The menu's two blocks: the scrolling entries, and the ones pinned to the
 * sidebar's foot (`AppNavItem.pinBottom`). Order within each is kept. */
export function splitPinned(items: AppNavItem[]): { main: AppNavItem[]; pinned: AppNavItem[] } {
  return {
    main: items.filter((item) => !item.pinBottom),
    pinned: items.filter((item) => item.pinBottom),
  };
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
