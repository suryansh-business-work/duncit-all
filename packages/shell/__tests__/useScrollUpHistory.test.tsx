/**
 * Scroll-up history for the portal chat threads, driven on a real element.
 *
 * jsdom lays nothing out, so the list's geometry is set by hand: `scrollTop` is
 * where the reader is, `scrollHeight` how tall the lines are. What the hook owes
 * the reader is checked in those numbers — the older page asked for only near
 * the top, and the reader's line still at the same place once it lands above.
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CHAT_HISTORY_TRIGGER_PX } from '@duncit/utils';

import { useScrollUpHistory, type ScrollUpHistoryOptions } from '../src/hooks/useScrollUpHistory';

/** A list whose position and height the test controls. */
function list(scrollTop: number, scrollHeight: number) {
  const node = document.createElement('div');
  Object.defineProperty(node, 'scrollHeight', { configurable: true, writable: true, value: scrollHeight });
  // jsdom clamps an assigned scrollTop to its zero layout; a writable own
  // property lets the test read back exactly what the hook wrote.
  Object.defineProperty(node, 'scrollTop', { configurable: true, writable: true, value: scrollTop });
  return node;
}

const mount = (node: HTMLElement | null, over: Partial<ScrollUpHistoryOptions> = {}) => {
  const scrollRef = { current: node };
  const onLoadOlder = vi.fn();
  const initial: ScrollUpHistoryOptions = {
    scrollRef,
    oldestId: 'm-31',
    hasMore: true,
    loading: false,
    onLoadOlder,
    ...over,
  };
  const hook = renderHook((props: ScrollUpHistoryOptions) => useScrollUpHistory(props), {
    initialProps: initial,
  });
  return { ...hook, scrollRef, onLoadOlder, initial };
};

describe('useScrollUpHistory — when the older page is asked for', () => {
  it('asks once the reader is within the trigger distance of the top', () => {
    const { result, onLoadOlder } = mount(list(CHAT_HISTORY_TRIGGER_PX, 3000));

    result.current.onScroll();

    expect(onLoadOlder).toHaveBeenCalledTimes(1);
  });

  it('does not ask while the reader is further down than the trigger distance', () => {
    const { result, onLoadOlder } = mount(list(CHAT_HISTORY_TRIGGER_PX + 1, 3000));

    result.current.onScroll();

    expect(onLoadOlder).not.toHaveBeenCalled();
  });

  it('does not ask again while a page is already on its way', () => {
    const { result, onLoadOlder } = mount(list(0, 3000), { loading: true });

    result.current.onScroll();
    result.current.loadOlder();

    expect(onLoadOlder).not.toHaveBeenCalled();
  });

  it('stops asking once the start of the conversation is on screen', () => {
    const { result, onLoadOlder } = mount(list(0, 3000), { hasMore: false });

    result.current.onScroll();
    result.current.loadOlder();

    expect(onLoadOlder).not.toHaveBeenCalled();
  });

  it('asks for nothing when the list is not mounted', () => {
    const { result, onLoadOlder } = mount(null);

    result.current.onScroll();
    result.current.loadOlder();

    expect(onLoadOlder).not.toHaveBeenCalled();
  });

  it('lets a button ask from anywhere in the list, not only near the top', () => {
    const { result, onLoadOlder } = mount(list(900, 3000));

    result.current.loadOlder();

    expect(onLoadOlder).toHaveBeenCalledTimes(1);
  });
});

describe('useScrollUpHistory — keeping the reader in place', () => {
  it('moves the position down by exactly the height the older page added', () => {
    const node = list(40, 3000);
    const { result, rerender, initial } = mount(node);

    result.current.onScroll();
    rerender({ ...initial, loading: true });
    // Still loading: the list has not changed, so neither does the position.
    expect(node.scrollTop).toBe(40);

    Object.defineProperty(node, 'scrollHeight', { configurable: true, writable: true, value: 4800 });
    rerender({ ...initial, oldestId: 'm-1', loading: false });

    expect(node.scrollTop).toBe(40 + 1800);
  });

  it('leaves the position alone when the page came back empty, and forgets the request', () => {
    const node = list(40, 3000);
    const { result, rerender, initial } = mount(node);

    result.current.onScroll();
    rerender({ ...initial, loading: true });
    rerender({ ...initial, loading: false });
    expect(node.scrollTop).toBe(40);

    // A later change of the first line (another chat opening) is not an older
    // page landing, so it must not be "corrected" by the stale request.
    node.scrollTop = 500;
    Object.defineProperty(node, 'scrollHeight', { configurable: true, writable: true, value: 9000 });
    rerender({ ...initial, oldestId: 'other-chat-first' });

    expect(node.scrollTop).toBe(500);
  });

  it('does not throw when the list unmounts while the page is on its way', () => {
    const node = list(40, 3000);
    const { result, rerender, initial, scrollRef } = mount(node);

    result.current.onScroll();
    scrollRef.current = null;

    expect(() => rerender({ ...initial, oldestId: 'm-1' })).not.toThrow();
    expect(node.scrollTop).toBe(40);
  });
});
