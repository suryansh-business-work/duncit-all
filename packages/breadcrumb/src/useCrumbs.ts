import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { BreadcrumbNavItem, Crumb } from './types';
import { findBestNavMatch } from './findBestNavMatch';
import { humanise } from './humanise';

interface UseCrumbsArgs {
  nav: BreadcrumbNavItem[];
  /** Home crumb label — the portal short name. */
  appName: string;
  /** Route-segment → label overrides for the divergent portals. */
  labelMap?: Record<string, string>;
  /** Page-provided trail replacing the auto (id) tail — see `useSetBreadcrumbs`. */
  override?: Crumb[] | null;
}

function pushOverride(list: Crumb[], override: Crumb[]): void {
  for (const crumb of override) list.push({ label: crumb.label, to: crumb.to });
}

/** Append the segments trailing a matched nav item (or the page override). */
function appendTail(
  list: Crumb[],
  pathname: string,
  matchTo: string,
  labelMap: Record<string, string> | undefined,
  override: Crumb[] | null | undefined,
): void {
  if (pathname === matchTo || !pathname.startsWith(`${matchTo}/`)) return;
  if (override && override.length > 0) {
    pushOverride(list, override);
    return;
  }
  const rest = pathname.slice(matchTo.length + 1).split('/').filter(Boolean);
  for (const seg of rest) list.push({ label: humanise(seg, labelMap) });
}

/** Fallback trail for a pathname that matched no nav item. */
function appendSegments(
  list: Crumb[],
  pathname: string,
  labelMap: Record<string, string> | undefined,
  override: Crumb[] | null | undefined,
): void {
  if (override && override.length > 0) {
    pushOverride(list, override);
    return;
  }
  const segments = pathname.split('/').filter(Boolean);
  segments.forEach((seg, idx) => {
    const isLeaf = idx === segments.length - 1;
    const to = `/${segments.slice(0, idx + 1).join('/')}`;
    list.push({ label: humanise(seg, labelMap), to: isLeaf ? undefined : to });
  });
}

/**
 * Compute the breadcrumb trail from the current route, the nav tree, and any
 * page-set dynamic override. The leaf crumb is always rendered as plain text.
 */
export function useCrumbs({ nav, appName, labelMap, override }: UseCrumbsArgs): Crumb[] {
  const { pathname } = useLocation();

  return useMemo<Crumb[]>(() => {
    const list: Crumb[] = [{ label: appName, to: '/' }];
    const match = findBestNavMatch(pathname, nav);

    if (match && match.to !== '/') {
      match.trail.forEach((entry, idx) => {
        if (idx === 0 && entry.label === appName) return;
        list.push({ label: entry.label, to: entry.to });
      });
      appendTail(list, pathname, match.to, labelMap, override);
    } else if (pathname !== '/' && pathname !== '/login') {
      appendSegments(list, pathname, labelMap, override);
    }

    const last = list[list.length - 1];
    if (last) last.to = undefined;
    return list;
  }, [pathname, nav, appName, labelMap, override]);
}
