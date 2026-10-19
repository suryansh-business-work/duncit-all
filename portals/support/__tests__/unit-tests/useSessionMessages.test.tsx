import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { useApolloClient } from '@apollo/client/react';
import { CHAT_HISTORY_PAGE } from '@duncit/utils';
import { useSessionMessages } from '../../src/pages/live-chat/LiveChatPage/useSessionMessages';
import { SUPPORT_CHAT_MESSAGES } from '../../src/graphql/supportChat';
import { chatMessage, chatPage, messagesMock, olderMessagesMock } from '../mocks/supportChat.mock';

/**
 * The open chat's lines in the agent console: the newest page on open, older
 * pages in front as the agent scrolls up, live socket lines at the end — all
 * against Apollo's mock link, so a request the hook should not make has no
 * answer and shows up as an error.
 */
function mount(mocks: MockedResponse[], sessionId: string | null = 'sess-a') {
  const onError = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      {children}
    </MockedProvider>
  );
  const hook = renderHook(
    ({ id }: { id: string | null }) => ({ client: useApolloClient(), thread: useSessionMessages(id, onError) }),
    { wrapper, initialProps: { id: sessionId } },
  );
  return { ...hook, onError };
}

const ids = (list: { id: string }[]) => list.map((m) => m.id);

describe('useSessionMessages — the first page', () => {
  it('opens on the newest page and offers older lines when it came back full', async () => {
    const page = chatPage('sess-a', CHAT_HISTORY_PAGE);
    const { result } = mount([messagesMock('sess-a', page)]);

    await waitFor(() => expect(result.current.thread.messages).toHaveLength(CHAT_HISTORY_PAGE));
    expect(result.current.thread.hasMore).toBe(true);
  });

  it('offers nothing above a short first page — that is the whole chat', async () => {
    const { result } = mount([messagesMock('sess-a', chatPage('sess-a', 4))]);

    await waitFor(() => expect(result.current.thread.messages).toHaveLength(4));
    expect(result.current.thread.hasMore).toBe(false);
  });

  it('asks for nothing with no chat open', async () => {
    const { result } = mount([], null);
    const query = vi.spyOn(result.current.client, 'query');

    await act(() => result.current.thread.loadOlder());

    expect(query).not.toHaveBeenCalled();
    expect(result.current.thread.messages).toEqual([]);
  });

  it('asks for nothing in a chat with no lines to page before', async () => {
    const { result } = mount([messagesMock('sess-a', [])]);
    await waitFor(() => expect(result.current.thread.loading).toBe(false));
    const query = vi.spyOn(result.current.client, 'query');

    await act(() => result.current.thread.loadOlder());

    expect(query).not.toHaveBeenCalled();
  });
});

describe('useSessionMessages — scrolling up', () => {
  it('fetches the page before the oldest line and puts it in front, a duplicate kept once', async () => {
    const page = chatPage('sess-a', CHAT_HISTORY_PAGE);
    // Overlaps the shown page by its first line — posted while the agent paged.
    const older = [...chatPage('sess-a', 3, 'o', 9), page[0]];
    const { result, onError } = mount([
      messagesMock('sess-a', page),
      olderMessagesMock('sess-a', page[0].created_at, older),
    ]);
    await waitFor(() => expect(result.current.thread.hasMore).toBe(true));

    await act(() => result.current.thread.loadOlder());

    expect(onError).not.toHaveBeenCalled();
    expect(ids(result.current.thread.messages)).toEqual(['o1', 'o2', 'o3', ...ids(page)]);
    // A short page: the start of the chat, so nothing more is asked for.
    expect(result.current.thread.hasMore).toBe(false);
    expect(result.current.thread.loadingOlder).toBe(false);
  });

  it('keeps offering more after a full older page', async () => {
    const page = chatPage('sess-a', CHAT_HISTORY_PAGE);
    const { result } = mount([
      messagesMock('sess-a', page),
      olderMessagesMock('sess-a', page[0].created_at, chatPage('sess-a', CHAT_HISTORY_PAGE, 'o', 9)),
    ]);
    await waitFor(() => expect(result.current.thread.hasMore).toBe(true));

    await act(() => result.current.thread.loadOlder());

    expect(result.current.thread.messages).toHaveLength(CHAT_HISTORY_PAGE * 2);
    expect(result.current.thread.hasMore).toBe(true);
  });

  it('treats an answer with no data as the start of the chat rather than throwing', async () => {
    const page = chatPage('sess-a', CHAT_HISTORY_PAGE);
    const { result, onError } = mount([messagesMock('sess-a', page)]);
    await waitFor(() => expect(result.current.thread.hasMore).toBe(true));
    vi.spyOn(result.current.client, 'query').mockResolvedValueOnce({ data: undefined } as never);

    await act(() => result.current.thread.loadOlder());

    expect(onError).not.toHaveBeenCalled();
    expect(result.current.thread.hasMore).toBe(false);
    expect(result.current.thread.messages).toHaveLength(CHAT_HISTORY_PAGE);
  });

  it('sends one request however many times the top is reached while it is in flight', async () => {
    const page = chatPage('sess-a', CHAT_HISTORY_PAGE);
    const { result } = mount([
      messagesMock('sess-a', page),
      olderMessagesMock('sess-a', page[0].created_at, chatPage('sess-a', 2, 'o', 9)),
    ]);
    await waitFor(() => expect(result.current.thread.hasMore).toBe(true));
    const query = vi.spyOn(result.current.client, 'query');

    await act(async () => {
      const first = result.current.thread.loadOlder();
      const second = result.current.thread.loadOlder();
      await Promise.all([first, second]);
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(result.current.thread.messages).toHaveLength(CHAT_HISTORY_PAGE + 2);
  });

  it('reports a failed page through the console notice and keeps the lines on screen', async () => {
    const page = chatPage('sess-a', CHAT_HISTORY_PAGE);
    const { result, onError } = mount([
      messagesMock('sess-a', page),
      {
        request: {
          query: SUPPORT_CHAT_MESSAGES,
          variables: { session_id: 'sess-a', limit: CHAT_HISTORY_PAGE, before: page[0].created_at },
        },
        error: new Error('Network down'),
      },
    ]);
    await waitFor(() => expect(result.current.thread.hasMore).toBe(true));

    await act(() => result.current.thread.loadOlder());

    expect(onError).toHaveBeenCalledWith('Network down');
    expect(result.current.thread.messages).toHaveLength(CHAT_HISTORY_PAGE);
    expect(result.current.thread.hasMore).toBe(true);
    expect(result.current.thread.loadingOlder).toBe(false);
  });

  it('drops a page that answers after the agent opened another chat', async () => {
    const page = chatPage('sess-a', CHAT_HISTORY_PAGE);
    const other = chatPage('sess-b', 2, 'b');
    const { result, rerender } = mount([
      messagesMock('sess-a', page),
      messagesMock('sess-b', other),
      { ...olderMessagesMock('sess-a', page[0].created_at, chatPage('sess-a', 2, 'o', 9)), delay: 30 },
    ]);
    await waitFor(() => expect(result.current.thread.hasMore).toBe(true));

    let loading: Promise<void> = Promise.resolve();
    act(() => {
      loading = result.current.thread.loadOlder();
    });
    rerender({ id: 'sess-b' });
    await act(() => loading);

    await waitFor(() => expect(ids(result.current.thread.messages)).toEqual(ids(other)));
  });
});

describe('useSessionMessages — live lines', () => {
  it('appends a socket line at the end and keeps a repeated one once', async () => {
    const page = chatPage('sess-a', 2);
    const { result } = mount([messagesMock('sess-a', page)]);
    await waitFor(() => expect(result.current.thread.messages).toHaveLength(2));

    const live = chatMessage('live-1', 'sess-a', 'USER', 'Still there?');
    act(() => result.current.thread.append(live));
    act(() => result.current.thread.append(live));

    expect(ids(result.current.thread.messages)).toEqual([...ids(page), 'live-1']);
  });

  it('starts another chat empty rather than on the last one’s lines', async () => {
    const { result, rerender } = mount([
      messagesMock('sess-a', chatPage('sess-a', 2)),
      messagesMock('sess-b', chatPage('sess-b', 1, 'b')),
    ]);
    await waitFor(() => expect(result.current.thread.messages).toHaveLength(2));

    rerender({ id: 'sess-b' });

    await waitFor(() => expect(ids(result.current.thread.messages)).toEqual(['b1']));
    expect(result.current.thread.hasMore).toBe(false);
  });
});
