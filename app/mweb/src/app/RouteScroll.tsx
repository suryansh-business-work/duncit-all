import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';

/** How far down each visited page was left, by history entry key. */
const savedOffsets = new Map<string, number>();

/** The shell's scroll pane when signed in; signed out, the window scrolls. */
const shellPane = () => document.getElementById('main-scroll');

function currentOffset(): number {
  const paneTop = shellPane()?.scrollTop ?? 0;
  return paneTop > 0 ? paneTop : globalThis.scrollY;
}

function scrollTo(top: number) {
  const pane = shellPane();
  if (pane) pane.scrollTop = top;
  globalThis.scrollTo(0, top);
}

/**
 * Where a page opens. A new page opens at the top. Going BACK (or forward) opens
 * a page where it was left: the native app keeps the previous screen alive under
 * the new one, so Back lands exactly where the user was, and mWeb — which
 * rebuilds the page — has to put them back itself. It runs before paint, so the
 * next page never shows for a frame at the previous page's scroll offset first.
 * A change that keeps the path (a tab's `?selectedtab=`) leaves the scroll alone.
 */
export default function RouteScroll() {
  const { key, pathname } = useLocation();
  const navigationType = useNavigationType();
  const currentKey = useRef(key);
  const lastPathname = useRef(pathname);

  useEffect(() => {
    const record = () => savedOffsets.set(currentKey.current, currentOffset());
    const pane = shellPane();
    pane?.addEventListener('scroll', record, { passive: true });
    globalThis.addEventListener('scroll', record, { passive: true });
    return () => {
      pane?.removeEventListener('scroll', record);
      globalThis.removeEventListener('scroll', record);
    };
  }, []);

  useLayoutEffect(() => {
    currentKey.current = key;
    if (pathname === lastPathname.current) return undefined;
    lastPathname.current = pathname;
    const target = navigationType === 'POP' ? (savedOffsets.get(key) ?? 0) : 0;
    scrollTo(target);
    if (target === 0) return undefined;
    // A page still growing after its first layout (images, measured rails) may
    // not reach a deep offset yet — try once more after it has painted.
    const frame = globalThis.requestAnimationFrame(() => scrollTo(target));
    return () => globalThis.cancelAnimationFrame(frame);
  }, [key, pathname, navigationType]);

  return null;
}
