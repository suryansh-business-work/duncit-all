import type { BreadcrumbNavItem } from './types';

interface TrailEntry {
  label: string;
  to?: string;
}

export interface MatchPath {
  trail: TrailEntry[];
  to: string;
}

/**
 * Walk the nav tree to find the deepest item whose `to` matches the current
 * pathname, returning the full parent→leaf trail so the breadcrumb can render
 * "Calculators › Pod Profit".
 */
export function findBestNavMatch(pathname: string, nav: BreadcrumbNavItem[]): MatchPath | undefined {
  let best: MatchPath | undefined;

  const visit = (item: BreadcrumbNavItem, trail: TrailEntry[]) => {
    const nextTrail = [...trail, { label: item.label, to: item.to }];
    if (item.to) {
      const isRoot = item.to === '/';
      const matches = isRoot ? pathname === '/' : pathname === item.to || pathname.startsWith(`${item.to}/`);
      if (matches && (!best || item.to.length > best.to.length)) {
        best = { trail: nextTrail, to: item.to };
      }
    }
    for (const child of item.children ?? []) visit(child, nextTrail);
  };

  for (const item of nav) visit(item, []);
  return best;
}
