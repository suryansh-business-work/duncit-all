import { useEffect, useRef, type RefObject } from 'react';
import { useLocation } from 'react-router';

/**
 * Moves keyboard focus to the page region when the route changes (WCAG 2.4.3).
 *
 * mWeb never reloads between pages, so after a tap on the bottom nav or a card
 * the focus stayed on a control that had just scrolled away, and a screen
 * reader heard nothing of the page that opened. Focusing the `<main>` (it
 * carries `tabIndex={-1}`) starts the next Tab at the top of the new page.
 * `preventScroll` leaves the offset RouteScroll restored alone.
 *
 * Focus already inside the page region is left alone — a page that autofocuses
 * its first field has put the reader where they should be.
 *
 * Keyed on the PATHNAME: a `?selectedtab=` change is the same page, and pulling
 * focus off the tab that changed it would lose the reader's place. The previous
 * path lives in a ref, so StrictMode's double effect does not focus on mount.
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
