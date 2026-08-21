import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Pull-down-to-refresh for a touch device, over the app shell's own scroller.
 *
 * mWeb runs inside a scrolling `<Container>` rather than the document, so the
 * browser's native overscroll refresh never fires — the gesture has to be read
 * here. The native app gets the same gesture from RN's `RefreshControl` (rule
 * 27), which is why the numbers below mirror its feel: a resisted drag, a
 * threshold to arm it, and a spinner that only stops when the refetch does.
 */

/** Drag past this (post-resistance) and letting go triggers the refresh. */
const TRIGGER_PX = 64;
/** The indicator never grows past this, however far the finger travels. */
const MAX_PULL_PX = 88;
/** Finger travel is halved so the pull feels weighted rather than sticky. */
const RESISTANCE = 0.5;

/** Nearest scrolling ancestor — the app shell's `#main-scroll` in practice. */
function scrollParent(node: HTMLElement | null): HTMLElement | null {
  let el = node?.parentElement ?? null;
  while (el) {
    const { overflowY } = globalThis.getComputedStyle(el);
    if (overflowY === 'auto' || overflowY === 'scroll') return el;
    el = el.parentElement;
  }
  return null;
}

export interface PullToRefresh {
  /** Put this on the page's root element — it locates the scroller to listen on. */
  anchorRef: (node: HTMLElement | null) => void;
  /** How far the finger has dragged, in px, after resistance. 0 when idle. */
  pull: number;
  /** True while the refetch is in flight, from either the gesture or a button. */
  refreshing: boolean;
  /** Runs the same refetch the gesture does — wire the header button to this. */
  refresh: () => void;
}

export function usePullToRefresh(onRefresh: () => Promise<unknown> | void): PullToRefresh {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // Refs, not state: the touch listeners are attached once and would otherwise
  // close over the first render's values.
  const handler = useRef(onRefresh);
  const busy = useRef(false);
  const startY = useRef<number | null>(null);
  const pulled = useRef(0);

  useEffect(() => {
    handler.current = onRefresh;
  }, [onRefresh]);

  const refresh = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    Promise.resolve(handler.current())
      .catch(() => undefined)
      .finally(() => {
        busy.current = false;
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    const target = scrollParent(anchor);
    if (!target) return undefined;

    const stop = () => {
      startY.current = null;
      pulled.current = 0;
      setPull(0);
    };

    const onStart = (e: TouchEvent) => {
      if (busy.current || target.scrollTop > 0 || e.touches.length !== 1) return;
      startY.current = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0 || target.scrollTop > 0) {
        stop();
        return;
      }
      // Without this the shell scrolls under the finger and the pull reads as
      // a normal (rubber-banding) drag instead of an armed gesture.
      e.preventDefault();
      pulled.current = Math.min(MAX_PULL_PX, delta * RESISTANCE);
      setPull(pulled.current);
    };

    const onEnd = () => {
      if (startY.current === null) return;
      const armed = pulled.current >= TRIGGER_PX;
      stop();
      if (armed) refresh();
    };

    target.addEventListener('touchstart', onStart, { passive: true });
    target.addEventListener('touchmove', onMove, { passive: false });
    target.addEventListener('touchend', onEnd);
    target.addEventListener('touchcancel', stop);
    return () => {
      target.removeEventListener('touchstart', onStart);
      target.removeEventListener('touchmove', onMove);
      target.removeEventListener('touchend', onEnd);
      target.removeEventListener('touchcancel', stop);
    };
  }, [anchor, refresh]);

  return { anchorRef: setAnchor, pull, refreshing, refresh };
}

export { MAX_PULL_PX, TRIGGER_PX };
