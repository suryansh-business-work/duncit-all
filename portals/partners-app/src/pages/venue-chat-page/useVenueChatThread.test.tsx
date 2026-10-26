import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { VENUE_CHAT_PAGE, type VenueChatLine } from '@duncit/utils';
import { syncWithPage, useVenueChatThread } from './useVenueChatThread';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';
import { at, line, ownLine, reaction } from '../../__tests__/venue-chat-fixtures';

afterEach(cleanup);

/** A bare line at 06:mm — all the sync reads is the id and when it was written. */
const bare = (id: string, minute: number, text = id): VenueChatLine => ({
  id,
  user_id: 'u-host',
  type: 'TEXT',
  text,
  deleted: false,
  createdAt: at(minute),
});
const ids = (lines: readonly VenueChatLine[]) => lines.map((entry) => entry.id);
const NONE: ReadonlySet<string> = new Set();

describe('syncWithPage', () => {
  it('lays the page over the thread: each line once, as the page has it now, oldest first', () => {
    const synced = syncWithPage([bare('a', 1), bare('b', 2)], [bare('a', 1), bare('b', 2, 'b, edited'), bare('c', 3)], NONE);
    expect(ids(synced)).toEqual(['a', 'b', 'c']);
    expect(synced.find((entry) => entry.id === 'b')?.text).toBe('b, edited');
  });

  it('drops a line a short page should have carried — a short page is the whole thread', () => {
    // 'b' sits between the page's ends but is not on it: its author took it back.
    expect(ids(syncWithPage([bare('a', 1), bare('b', 2), bare('c', 3)], [bare('a', 1), bare('c', 3)], NONE))).toEqual(['a', 'c']);
  });

  it('keeps the older lines a full page cannot reach', () => {
    const page = Array.from({ length: VENUE_CHAT_PAGE }, (_, index) => bare(`p${index}`, 10 + index));
    const synced = syncWithPage([bare('older', 0), bare('old', 1), ...page.slice(0, 3)], page, NONE);
    expect(synced).toHaveLength(VENUE_CHAT_PAGE + 2);
    expect(ids(synced).slice(0, 3)).toEqual(['older', 'old', 'p0']);
  });

  it('still drops a missing line inside a full page’s window', () => {
    const page = Array.from({ length: VENUE_CHAT_PAGE }, (_, index) => bare(`p${index}`, 2 * index));
    // 'gone' was written between p0 and p1 — the page reaches it, so its absence means it was removed.
    const synced = syncWithPage([bare('gone', 1), ...page], page, NONE);
    expect(ids(synced)).not.toContain('gone');
    expect(synced).toHaveLength(VENUE_CHAT_PAGE);
  });

  it('keeps a line sent from here that is newer than the page — the poll was already on its way', () => {
    const synced = syncWithPage([bare('a', 1), bare('mine', 5)], [bare('a', 1)], new Set(['mine']));
    expect(ids(synced)).toEqual(['a', 'mine']);
  });

  it('drops a newer line nobody here sent, and a line sent here the page should have carried', () => {
    const page = [bare('a', 1), bare('c', 4)];
    expect(ids(syncWithPage([bare('a', 1), bare('late', 6)], page, NONE))).toEqual(['a', 'c']);
    expect(ids(syncWithPage([bare('a', 1), bare('mine', 2)], page, new Set(['mine'])))).toEqual(['a', 'c']);
  });

  it('keeps only the lines sent from here when the page comes back empty', () => {
    expect(ids(syncWithPage([bare('a', 1), bare('mine', 2)], [], new Set(['mine'])))).toEqual(['mine']);
    expect(syncWithPage([bare('a', 1)], [], NONE)).toEqual([]);
  });
});

/** The hook over a scripted server; `pages` are the successive answers to the thread's read. */
const mountHook = (pages: unknown[][], answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) => {
  let reads = 0;
  const link = scriptedLink(
    {
      VenueChatMessages: () => ({ venueChatMessages: pages[Math.min(reads++, pages.length - 1)] }),
      ...answers,
    },
    sent,
  );
  const wrapper = ({ children }: { children: ReactNode }) => <MockedProvider link={link}>{children}</MockedProvider>;
  return renderHook(() => useVenueChatThread('pod-1'), { wrapper });
};

describe('useVenueChatThread', () => {
  const ASKED = line('t1');
  const SENT_LINE = ownLine('s1', { text: 'Hello', createdAt: at(30) });

  it('reads the newest page without marking the thread read, spinning only until the first answer', async () => {
    const sent: SentOperation[] = [];
    const { result } = mountHook([[ASKED]], {}, sent);
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(ids(result.current.lines)).toEqual(['t1']));
    expect(result.current.loading).toBe(false);
    expect(sent[0]).toEqual({ name: 'VenueChatMessages', variables: { pod_id: 'pod-1', limit: VENUE_CHAT_PAGE, mark_read: false } });
  });

  it('keeps a sent line through a poll that missed it, until a poll carries it, and drops it once a poll shows it gone', async () => {
    const reacted = line('t1', { reactions: [reaction('u-venue', '👍')] });
    const pages = [
      [ASKED],
      // Asked before the send landed: the sent line is newer than all of it.
      [reacted],
      [reacted, ownLine('s1', { text: 'Hello (edited)', createdAt: at(30), edited_at: at(31) })],
      // A later line from the host, and no s1: its author removed it elsewhere.
      [reacted, line('t2', { text: 'Thanks!', createdAt: at(40) })],
    ];
    const { result } = mountHook(pages, { SendVenueChatMessage: { sendVenueChatMessage: SENT_LINE } });
    await waitFor(() => expect(ids(result.current.lines)).toEqual(['t1']));

    let ok = false;
    await act(async () => {
      ok = await result.current.sendText('Hello');
    });
    expect(ok).toBe(true);
    expect(ids(result.current.lines)).toEqual(['t1', 's1']);

    await act(async () => {
      await result.current.retry();
    });
    await waitFor(() => expect(result.current.lines[0].reactions).toHaveLength(1));
    expect(ids(result.current.lines)).toEqual(['t1', 's1']);

    await act(async () => {
      await result.current.retry();
    });
    await waitFor(() => expect(result.current.lines[1].text).toBe('Hello (edited)'));

    await act(async () => {
      await result.current.retry();
    });
    await waitFor(() => expect(ids(result.current.lines)).toEqual(['t1', 't2']));
  });

  it('resolves false and adds nothing when the server refuses the line', async () => {
    const { result } = mountHook([[ASKED]], { SendVenueChatMessage: new Error('This chat is closed') });
    await waitFor(() => expect(ids(result.current.lines)).toEqual(['t1']));
    let ok = true;
    await act(async () => {
      ok = await result.current.sendText('Hello');
    });
    expect(ok).toBe(false);
    expect(ids(result.current.lines)).toEqual(['t1']);
  });

  it('puts a changed line in place and takes a removed one off', async () => {
    const { result } = mountHook([[ASKED, ownLine('o1')]]);
    await waitFor(() => expect(ids(result.current.lines)).toEqual(['t1', 'o1']));

    act(() => result.current.putLine(line('t1', { reactions: [reaction('u-venue', '🎉')] })));
    expect(result.current.lines[0].reactions).toEqual([reaction('u-venue', '🎉')]);
    expect(result.current.lines).toHaveLength(2);

    act(() => result.current.removeLine('o1'));
    expect(ids(result.current.lines)).toEqual(['t1']);
  });

  it('reports a thread it could not read', async () => {
    const { result } = mountHook([[ASKED]], { VenueChatMessages: new Error('Not a member of this chat') });
    await waitFor(() => expect(result.current.error?.message).toBe('Not a member of this chat'));
    expect(result.current.lines).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
