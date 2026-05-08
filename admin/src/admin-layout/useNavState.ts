import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NAV, isNavGroup, type NavGroup, type NavLeaf, type NavSection } from './navConfig';

export function useNavState() {
  const location = useLocation();
  const [navSearch, setNavSearch] = useState('');

  const isPathActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/');

  const isGroupActive = (g: NavGroup) =>
    g.children.some((c) => isPathActive(c.to)) ||
    (g.matchPrefix ? location.pathname.startsWith(g.matchPrefix) : false);

  const initialOpen = (): Record<string, boolean> => {
    const o: Record<string, boolean> = {};
    for (const s of NAV) {
      for (const i of s.items) {
        if (isNavGroup(i)) o[i.label] = isGroupActive(i);
      }
    }
    return o;
  };
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const s of NAV) {
        for (const i of s.items) {
          if (isNavGroup(i) && isGroupActive(i)) next[i.label] = true;
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = (label: string) =>
    setOpenGroups((p) => ({ ...p, [label]: !p[label] }));

  const navQuery = navSearch.trim().toLowerCase();
  const activeSections: NavSection[] =
    location.pathname === '/' || location.pathname.startsWith('/hub')
      ? []
      : NAV.filter(
          (s) => s.prefixes && s.prefixes.some((p) => location.pathname.startsWith(p))
        );

  const visibleNav: NavSection[] = useMemo(() => {
    if (!navQuery) return activeSections.length > 0 ? activeSections : NAV;

    return NAV.map((section) => {
      const sectionMatch = section.heading?.toLowerCase().includes(navQuery) ?? false;
      const items = section.items
        .map((item) => {
          if (!isNavGroup(item)) {
            return item.label.toLowerCase().includes(navQuery) || sectionMatch ? item : null;
          }
          const groupMatch = item.label.toLowerCase().includes(navQuery) || sectionMatch;
          const children = groupMatch
            ? item.children
            : item.children.filter((child) => child.label.toLowerCase().includes(navQuery));
          return groupMatch || children.length ? { ...item, children } : null;
        })
        .filter(Boolean) as (NavLeaf | NavGroup)[];
      return items.length ? { ...section, items } : null;
    }).filter(Boolean) as NavSection[];
  }, [activeSections, navQuery]);

  const showModulesItem =
    !navQuery || 'modules'.includes(navQuery) || 'hub'.includes(navQuery);

  return {
    location,
    navSearch,
    setNavSearch,
    navQuery,
    isPathActive,
    isGroupActive,
    openGroups,
    toggleGroup,
    visibleNav,
    showModulesItem,
  };
}
