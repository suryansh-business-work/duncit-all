import { useEffect, useRef, type RefObject } from 'react';
import { useLocation } from 'react-router';

/**
 * Moves keyboard focus to the page region when the route changes (WCAG 2.4.3).
 *
 * A client-routed app never reloads, so after picking a sidebar entry (portal
 * shell) or tapping a bottom-nav tab or card (mWeb) the focus stayed on that
 * control and a screen reader heard nothing of the new page. One hook serves
 * both, because both render their `<main>` the same way (rule 40).
 * Focusing the `<main>` (which carries `tabIndex={-1}`) starts the next Tab from
 * the top of the page it opened. `preventScroll` keeps the viewport where the
 * page's own scroll restoration put it.
 *
 * Focus that is ALREADY inside the page region is left alone: a new page that
 * autofocuses its first field, or a sub-navigation link that lives inside the
 * page, has put the reader exactly where they should be.
 *
 * Keyed on the PATHNAME only: a tab or filter written to the query string is
 * the same page. The previous path is kept in a ref rather than a "first
 * render" flag, so StrictMode's double effect in development does not focus the
 * page on mount.
 */
export function useRouteFocus(target: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    const region = target.current;
    if (!region || region.contains(document.activeElement)) return;
    region.focus({ preventScroll: true });
  }, [pathname, target]);
}
