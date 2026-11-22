import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type RefObject } from 'react';
import { buildOffsets, computeRange, type VirtualRange } from '@duncit/virtual-scroll';
import { isNearBottom } from '@duncit/utils';

/** Height guess for a message not measured yet. */
const ESTIMATE = 120;
export const ROW_GAP = 12;
const OVERSCAN = 900;
/** Show "move to bottom" once the reader is this far up. */
const JUMP_THRESHOLD = 240;
/** Ask for older messages when the reader is this close to the top. */
const LOAD_OLDER_PX = 160;

/**
 * Virtual scrolling for the Ask Duncit thread inside its own scroll pane:
 * only the messages near the viewport are mounted (math from
 * @duncit/virtual-scroll), heights are measured by message id so loading older
 * messages never throws measurements away, and the pane follows new text only
 * while the reader is at the bottom (the shared `isNearBottom` rule).
 */
export function useChatWindow(ids: readonly string[], scrollerRef: RefObject<HTMLDivElement | null>, onNearTop: () => void) {
  const measured = useRef(new Map<string, number>());
  const observers = useRef(new Map<string, ResizeObserver>());
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [view, setView] = useState({ top: 0, height: 800 });
  const pinned = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const heights = ids.map((id) => measured.current.get(id) ?? ESTIMATE);
  const offsets = buildOffsets(heights, ROW_GAP);
  const range: VirtualRange = computeRange({
    offsets,
    viewTop: view.top,
    viewBottom: view.top + view.height,
    overscanLead: OVERSCAN,
    overscanTrail: OVERSCAN,
  });
  const total = offsets[ids.length] ?? 0;

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinned.current = isNearBottom(fromBottom);
    setShowJump(fromBottom > JUMP_THRESHOLD);
    setView({ top: el.scrollTop, height: el.clientHeight });
    if (el.scrollTop < LOAD_OLDER_PX) onNearTop();
  }, [scrollerRef, onNearTop]);

  /** Callback ref for one message row: measures it and keeps measuring as it grows (streaming). */
  const measure = useCallback(
    (id: string) => (node: HTMLDivElement | null) => {
      observers.current.get(id)?.disconnect();
      observers.current.delete(id);
      if (!node) return;
      const observer = new ResizeObserver(([entry]) => {
        const height = Math.ceil(entry.contentRect.height);
        if (height && measured.current.get(id) !== height) {
          measured.current.set(id, height);
          bump();
        }
      });
      observer.observe(node);
      observers.current.set(id, observer);
    },
    []
  );

  useEffect(() => () => observers.current.forEach((o) => o.disconnect()), []);

  // Older messages prepended above: keep the reader's place by the height they added.
  const firstId = ids[0];
  const previous = useRef({ firstId, total });
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    const before = previous.current;
    if (el && before.firstId && firstId !== before.firstId && !pinned.current) {
      el.scrollTop += total - before.total;
    }
    previous.current = { firstId, total };
  }, [firstId, total, scrollerRef]);

  // Follow new text while pinned to the bottom.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  });

  const jumpToBottom = useCallback(() => {
    const el = scrollerRef.current;
    pinned.current = true;
    setShowJump(false);
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [scrollerRef]);

  /** Sending re-pins, so the person's own question scrolls into view. */
  const pin = useCallback(() => {
    pinned.current = true;
  }, []);

  return { range, total, measure, onScroll, showJump, jumpToBottom, pin };
}
