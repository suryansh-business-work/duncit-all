import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { buildOffsets, computeRange, type VirtualRange } from '@duncit/virtual-scroll';

/** Mounted pixels beyond the viewport; the trail is bigger so upcoming rows
 * exist before the user reaches the bottom (infinite-scroll prefetch). */
const OVERSCAN_LEAD = 600;
const OVERSCAN_TRAIL = 1600;

/** The app shell's scroll pane when present, else the window scrolls. */
function getScroller(): HTMLElement | null {
  return document.getElementById('main-scroll');
}

interface UseVirtualRowsInput {
  rowCount: number;
  /** Height guess for a row that has not been measured yet. */
  estimateOf: (row: number) => number;
  gap: number;
  /** Row-model identity (columns + query) — changing it drops measurements. */
  resetKey: string;
}

/**
 * Windowed rendering over the page scroll: mounts only the rows inside the
 * viewport (+ overscan) between two spacers, measuring real row heights as
 * they render so the spacers and jump offsets stay exact. The math lives in
 * @duncit/virtual-scroll; this hook is only the DOM glue.
 */
export function useVirtualRows({ rowCount, estimateOf, gap, resetKey }: Readonly<UseVirtualRowsInput>) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const measuredRef = useRef(new Map<number, number>());
  const [, bumpMeasure] = useReducer((tick: number) => tick + 1, 0);

  useEffect(() => {
    measuredRef.current.clear();
    bumpMeasure();
  }, [resetKey]);

  // Rebuilt every render (cheap) so fresh measurements apply immediately.
  const heights: number[] = new Array(rowCount);
  for (let i = 0; i < rowCount; i += 1) {
    heights[i] = measuredRef.current.get(i) ?? estimateOf(i);
  }
  const offsets = buildOffsets(heights, gap);
  const offsetsRef = useRef(offsets);
  offsetsRef.current = offsets;

  const [range, setRange] = useState<VirtualRange>({ start: 0, end: -1, leadPad: 0, trailPad: 0 });
  const rangeRef = useRef(range);
  rangeRef.current = range;

  const refresh = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scroller = getScroller();
    const viewportTop = scroller ? scroller.getBoundingClientRect().top : 0;
    const viewportHeight = scroller ? scroller.clientHeight : globalThis.innerHeight;
    const viewTop = viewportTop - rect.top;
    const next = computeRange({
      offsets: offsetsRef.current,
      viewTop,
      viewBottom: viewTop + viewportHeight,
      overscanLead: OVERSCAN_LEAD,
      overscanTrail: OVERSCAN_TRAIL,
    });
    const prev = rangeRef.current;
    const changed =
      next.start !== prev.start ||
      next.end !== prev.end ||
      next.leadPad !== prev.leadPad ||
      next.trailPad !== prev.trailPad;
    if (changed) setRange(next);
  }, []);

  useEffect(() => {
    const target: EventTarget = getScroller() ?? globalThis;
    let frame = 0;
    const onScrollOrResize = () => {
      if (frame) return;
      frame = globalThis.requestAnimationFrame(() => {
        frame = 0;
        refresh();
      });
    };
    target.addEventListener('scroll', onScrollOrResize, { passive: true });
    globalThis.addEventListener('resize', onScrollOrResize);
    return () => {
      if (frame) globalThis.cancelAnimationFrame(frame);
      target.removeEventListener('scroll', onScrollOrResize);
      globalThis.removeEventListener('resize', onScrollOrResize);
    };
  }, [refresh]);

  // The row model or a measurement changed in this render — re-derive the
  // range (the equality guard above stops this from looping).
  useEffect(() => {
    refresh();
  });

  /** Ref callback for a mounted row — records its real height. */
  const measureRow = useCallback(
    (row: number) => (el: HTMLElement | null) => {
      if (!el) return;
      const height = el.offsetHeight;
      const prev = measuredRef.current.get(row);
      if (prev === undefined || Math.abs(prev - height) > 1) {
        measuredRef.current.set(row, height);
        bumpMeasure();
      }
    },
    [],
  );

  /** Scroll the page so `row` sits at the top of the viewport. */
  const scrollToRow = useCallback((row: number) => {
    const el = listRef.current;
    if (!el?.isConnected) return;
    const offs = offsetsRef.current;
    const count = offs.length - 1;
    if (count <= 0) return;
    const target = offs[Math.min(Math.max(row, 0), count - 1)];
    const rect = el.getBoundingClientRect();
    const scroller = getScroller();
    if (scroller) {
      const top = rect.top - scroller.getBoundingClientRect().top + scroller.scrollTop + target;
      scroller.scrollTo({ top });
    } else {
      globalThis.scrollTo({ top: rect.top + globalThis.scrollY + target });
    }
  }, []);

  return { listRef, range, measureRow, scrollToRow };
}
