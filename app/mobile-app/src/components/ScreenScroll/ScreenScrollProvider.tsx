import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { scrollToTop, type ScrollableToTop } from '@duncit/utils';

interface ScreenScroll {
  /** Adds a vertical scroll view of this screen; returns the matching removal. */
  register: (view: ScrollableToTop) => () => void;
  /** Puts every registered scroll view of this screen back at its top. */
  scrollToTop: () => void;
}

const ScreenScrollContext = createContext<ScreenScroll | null>(null);

/**
 * One per screen (mounted by `screenLayout`): the screen's vertical scroll
 * views register here — `RefreshScrollView` does it by itself — so whatever
 * opens a NEW page on the same mounted screen (entering a tab, the next
 * wizard step) can put it at the top without threading a ref through.
 */
export function ScreenScrollProvider({ children }: Readonly<{ children: ReactNode }>) {
  const views = useRef(new Set<ScrollableToTop>());
  const value = useMemo<ScreenScroll>(
    () => ({
      register: (view) => {
        views.current.add(view);
        return () => {
          views.current.delete(view);
        };
      },
      scrollToTop: () => {
        for (const view of views.current) scrollToTop(view);
      },
    }),
    [],
  );
  return <ScreenScrollContext.Provider value={value}>{children}</ScreenScrollContext.Provider>;
}

/** This screen's scroll registry — null outside a screen (a test, a floating dialog). */
export function useScreenScroll(): ScreenScroll | null {
  return useContext(ScreenScrollContext);
}

/**
 * Scrolls the screen back to the top each time `key` changes after the first
 * render — a wizard's step, so the next step opens at its top like a new page
 * (mWeb's twin is `useScrollTopOnChange` in `app/pageScroll`).
 */
export function useScrollTopOnChange(key: unknown): void {
  const screenScroll = useScreenScroll();
  const previous = useRef(key);
  useEffect(() => {
    if (Object.is(previous.current, key)) return;
    previous.current = key;
    screenScroll?.scrollToTop();
  }, [key, screenScroll]);
}
