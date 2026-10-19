/**
 * The lines of a staff conversation above its live page.
 *
 * Driven directly with a stub client: the page asked for (cursor, size), what
 * lands in front and how a duplicate is kept once, when paging stops, and the
 * lines the live page lets go of as new messages push the window forward.
 */
import type { ApolloClient } from '@apollo/client';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CHAT_HISTORY_PAGE } from '@duncit/utils';

import { useStaffHistory } from '../src/staff-chat/useStaffHistory';
import type { StaffMessage } from '../src/staff-chat/queries';

const line = (n: number, over: Partial<StaffMessage> = {}): StaffMessage => ({
  id: `m${n}`,
  from_user_id: 'u1',
  to_user_id: 'me',
  text: `line ${n}`,
  created_at: new Date(Date.UTC(2026, 7, 20, 9, n)).toISOString(),
  ...over,
});

/** Lines `from`..`to`, oldest first, the way the server answers a page. */
const lines = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => line(from + i));

type Props = { peerId: string | undefined; live: StaffMessage[] };

function mount(initial: Props, query = vi.fn()) {
  const client = { query } as unknown as ApolloClient;
  const onError = vi.fn();
  const hook = renderHook((props: Props) => useStaffHistory({ client, onError, ...props }), {
    initialProps: initial,
  });
  return { ...hook, query, onError };
}

const ids = (messages: StaffMessage[]) => messages.map((m) => m.id);

describe('useStaffHistory — the first page', () => {
  it('offers older lines only when the first page came back full', () => {
    expect(mount({ peerId: 'u1', live: lines(1, CHAT_HISTORY_PAGE) }).result.current.hasMore).toBe(true);
    expect(mount({ peerId: 'u1', live: lines(1, CHAT_HISTORY_PAGE - 1) }).result.current.hasMore).toBe(false);
  });

  it('offers nothing for an empty conversation, and asks for nothing', async () => {
    const { result, query } = mount({ peerId: 'u1', live: [] });

    await act(() => result.current.loadOlder());

    expect(result.current.hasMore).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it('asks for nothing without a conversation open', async () => {
    const { result, query } = mount({ peerId: undefined, live: lines(1, CHAT_HISTORY_PAGE) });

    await act(() => result.current.loadOlder());

    expect(query).not.toHaveBeenCalled();
  });

  it('asks for nothing when the oldest line has no timestamp to page before', async () => {
    const { result, query } = mount({ peerId: 'u1', live: [line(1, { created_at: null })] });

    await act(() => result.current.loadOlder());

    expect(query).not.toHaveBeenCalled();
  });
});

describe('useStaffHistory — scrolling up', () => {
  it('asks for the page before the oldest line and puts it in front, a duplicate kept once', async () => {
    const live = lines(31, 60);
    // The server's page overlaps the live one by a line: posted while paging.
    const query = vi.fn().mockResolvedValue({ data: { staffMessages: [...lines(1, 30), line(31)] } });
    const { result } = mount({ peerId: 'u1', live }, query);

    await act(() => result.current.loadOlder());

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { peerId: 'u1', limit: CHAT_HISTORY_PAGE, before: live[0].created_at },
        fetchPolicy: 'network-only',
      })
    );
    expect(ids(result.current.messages)).toEqual(ids(lines(1, 60)));
    // A full page: there may be more above it.
    expect(result.current.hasMore).toBe(true);
  });

  it('stops once a page comes back short — that is the start of the conversation', async () => {
    const query = vi.fn().mockResolvedValue({ data: { staffMessages: lines(1, 5) } });
    const { result } = mount({ peerId: 'u1', live: lines(6, 35) }, query);

    await act(() => result.current.loadOlder());

    expect(result.current.hasMore).toBe(false);
    expect(result.current.messages).toHaveLength(35);
  });

  it('treats an answer with no data as the start rather than throwing', async () => {
    const query = vi.fn().mockResolvedValue({ data: undefined });
    const { result } = mount({ peerId: 'u1', live: lines(1, 30) }, query);

    await act(() => result.current.loadOlder());

    expect(result.current.hasMore).toBe(false);
    expect(result.current.messages).toHaveLength(30);
  });

  it('sends one request however many times the top is reached while it is in flight', async () => {
    let answer: (value: unknown) => void = () => undefined;
    const query = vi.fn(() => new Promise((resolve) => {
      answer = resolve;
    }));
    const { result } = mount({ peerId: 'u1', live: lines(31, 60) }, query);

    act(() => {
      void result.current.loadOlder();
      void result.current.loadOlder();
    });
    expect(result.current.loadingMore).toBe(true);
    await act(async () => answer({ data: { staffMessages: lines(1, 30) } }));

    expect(query).toHaveBeenCalledTimes(1);
    expect(result.current.loadingMore).toBe(false);
  });

  it('reports a failed page and leaves the lines on screen alone', async () => {
    const query = vi.fn().mockRejectedValue(new Error('offline'));
    const { result, onError } = mount({ peerId: 'u1', live: lines(1, 30) }, query);

    await act(() => result.current.loadOlder());

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'offline' }));
    expect(result.current.messages).toHaveLength(30);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.loadingMore).toBe(false);
  });

  it('drops a page that answers after the reader moved to another conversation', async () => {
    let answer: (value: unknown) => void = () => undefined;
    const query = vi.fn(() => new Promise((resolve) => {
      answer = resolve;
    }));
    const { result, rerender } = mount({ peerId: 'u1', live: lines(31, 60) }, query);

    act(() => void result.current.loadOlder());
    const other = [line(1, { id: 'p1', from_user_id: 'u2' })];
    rerender({ peerId: 'u2', live: other });
    await act(async () => answer({ data: { staffMessages: lines(1, 30) } }));

    expect(ids(result.current.messages)).toEqual(['p1']);
  });

  it('shows the live copy of a line it also holds from history, which is fresher', async () => {
    const query = vi.fn().mockResolvedValue({ data: { staffMessages: lines(1, 30) } });
    const { result, rerender } = mount({ peerId: 'u1', live: lines(31, 60) }, query);
    await act(() => result.current.loadOlder());

    const edited = { ...line(30), text: 'edited', edited_at: line(61).created_at };
    rerender({ peerId: 'u1', live: [edited, ...lines(31, 60)] });

    const shown = result.current.messages.filter((m) => m.id === 'm30');
    expect(shown).toEqual([edited]);
  });
});

describe('useStaffHistory — the live page moving on', () => {
  it('keeps the line that falls off the live page when a new one arrives', () => {
    const { result, rerender } = mount({ peerId: 'u1', live: lines(1, 30) });

    rerender({ peerId: 'u1', live: lines(2, 31) });

    expect(ids(result.current.messages)).toEqual(ids(lines(1, 31)));
  });

  it('does not bring back a line that left from inside the window', () => {
    const { result, rerender } = mount({ peerId: 'u1', live: lines(1, 3) });

    // m2 is gone from the middle (cleared), not pushed off the top.
    rerender({ peerId: 'u1', live: [line(1), line(3)] });

    expect(ids(result.current.messages)).toEqual(['m1', 'm3']);
  });

  it('never carries one conversation’s lines into the next', () => {
    const { result, rerender } = mount({ peerId: 'u1', live: lines(1, 30) });

    rerender({ peerId: 'u2', live: lines(40, 45) });

    expect(ids(result.current.messages)).toEqual(ids(lines(40, 45)));
  });

  it('carries nothing when the live page empties', () => {
    const { result, rerender } = mount({ peerId: 'u1', live: lines(1, 3) });

    rerender({ peerId: 'u1', live: [] });

    expect(result.current.messages).toEqual([]);
  });
});

describe('useStaffHistory — clearing', () => {
  it('forgets the history and offers nothing above once the conversation is cleared', async () => {
    const query = vi.fn().mockResolvedValue({ data: { staffMessages: lines(1, 30) } });
    const { result } = mount({ peerId: 'u1', live: lines(31, 60) }, query);
    await act(() => result.current.loadOlder());

    act(() => result.current.clearHistory());

    await waitFor(() => expect(result.current.messages).toHaveLength(30));
    expect(result.current.hasMore).toBe(false);
  });
});
