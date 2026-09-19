import { useEffect, useState } from 'react';

/** The app shell's scroller (App.tsx) — signed in, the page area under the header scrolls inside it. */
const SCROLLER_ID = 'main-scroll';
/** How far the floating bottom nav rides over the page, published by BottomNav; unset when it is not shown. */
const NAV_OVERLAY_VAR = '--duncit-bottom-nav-overlay-offset';

/**
 * How tall one full-page section of the waitlist is: the page area a reader
 * can see at once. Signed in, that is the shell's scroller minus the strip the
 * floating nav covers; signed out (a shared link) the document itself scrolls,
 * so it is the viewport. Measured, because the header publishes no height and
 * a percentage cannot climb through the route tree to the scroller.
 */
export function useLaunchViewportHeight(): number {
  const [height, setHeight] = useState(() => globalThis.innerHeight || 0);

  useEffect(() => {
    const scroller = document.getElementById(SCROLLER_ID);
    const scrolling = scroller && getComputedStyle(scroller).overflowY === 'auto' ? scroller : null;
    const measure = () => {
      if (!scrolling) {
        setHeight(globalThis.innerHeight);
        return;
      }
      const navOverlay = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(NAV_OVERLAY_VAR),
      );
      setHeight(scrolling.clientHeight - (Number.isNaN(navOverlay) ? 0 : navOverlay));
    };
    measure();
    if (scrolling) {
      const observer = new ResizeObserver(measure);
      observer.observe(scrolling);
      return () => observer.disconnect();
    }
    globalThis.addEventListener('resize', measure);
    return () => globalThis.removeEventListener('resize', measure);
  }, []);

  return height;
}
