import { useEffect, useRef } from 'react';

/** The shell's scroll pane when signed in; signed out, the window scrolls. */
export const shellPane = () => document.getElementById('main-scroll');

/** Puts the page at `top` — the shell pane and the window alike. */
export function scrollPageTo(top: number): void {
  const pane = shellPane();
  if (pane) pane.scrollTop = top;
  globalThis.scrollTo(0, top);
}

/**
 * Scrolls the page back to the top each time `key` changes after the first
 * render — a wizard's step, so the next step opens at its top like a new page
 * (`RouteScroll` does the same for a new route). The native twin is
 * `useScrollTopOnChange` in the app's `components/ScreenScroll`.
 */
export function useScrollTopOnChange(key: unknown): void {
  const previous = useRef(key);
  useEffect(() => {
    if (Object.is(previous.current, key)) return;
    previous.current = key;
    scrollPageTo(0);
  }, [key]);
}
