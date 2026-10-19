import { useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { CHAT_HISTORY_PAGE, CHAT_HISTORY_TRIGGER_PX } from '@duncit/utils';

import { useChatHistory } from '@/hooks/useChatHistory';

interface Line {
  id: string;
  at: string;
}

const line = (n: number): Line => ({ id: `m${n}`, at: `cursor-${n}` });
/** Lines `from`..`to`, oldest first, as the server pages them. */
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => line(from + i));

const scrollAt = (y: number) =>
  ({ nativeEvent: { contentOffset: { y } } }) as unknown as NativeSyntheticEvent<NativeScrollEvent>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function mountWith(fetchOlder: jest.Mock) {
  return renderHook(() => {
    const [messages, setMessages] = useState<Line[]>([]);
    const history = useChatHistory({ messages, setMessages, fetchOlder, timeOf: (m) => m.at });
    return { messages, setMessages, history };
  });
}

/** Mounts with a newest page already shown, as a room's first load leaves it. */
function mountLoaded(fetchOlder: jest.Mock, firstPage: Line[]) {
  const view = mountWith(fetchOlder);
  act(() => {
    view.result.current.setMessages(firstPage);
    view.result.current.history.startHistory(firstPage.length);
  });
  return view;
}

const ids = (lines: Line[]) => lines.map((m) => m.id);

describe('useChatHistory', () => {
  it('expects older lines only after a full first page', () => {
    const full = mountLoaded(jest.fn(), range(31, 60));
    expect(full.result.current.history.hasOlder).toBe(true);

    const short = mountLoaded(jest.fn(), range(1, 5));
    expect(short.result.current.history.hasOlder).toBe(false);
  });

  it('asks for the page before the oldest line and puts it in front, each line once', async () => {
    // The older page overlaps the shown one by a line (m31), as a live post shifts the window.
    const fetchOlder = jest.fn().mockResolvedValue(range(2, 31));
    const { result } = mountLoaded(fetchOlder, range(31, 60));

    await act(async () => {
      await result.current.history.loadOlder();
    });

    expect(fetchOlder).toHaveBeenCalledWith(line(31).at);
    expect(ids(result.current.messages)).toEqual(ids(range(2, 60)));
    expect(result.current.history.hasOlder).toBe(true);
    expect(result.current.history.loadingOlder).toBe(false);
  });

  it('stops at a short page: the start of the room', async () => {
    const fetchOlder = jest.fn().mockResolvedValue(range(1, 4));
    const { result } = mountLoaded(fetchOlder, range(5, 34));

    await act(async () => {
      await result.current.history.loadOlder();
    });
    expect(result.current.history.hasOlder).toBe(false);
    expect(ids(result.current.messages)).toEqual(ids(range(1, 34)));

    await act(async () => {
      await result.current.history.loadOlder();
    });
    expect(fetchOlder).toHaveBeenCalledTimes(1);
  });

  it('runs one older request at a time and shows it is loading', async () => {
    const page = deferred<Line[]>();
    const fetchOlder = jest.fn().mockReturnValue(page.promise);
    const { result } = mountLoaded(fetchOlder, range(31, 60));

    let first!: Promise<void>;
    act(() => {
      first = result.current.history.loadOlder();
    });
    expect(result.current.history.loadingOlder).toBe(true);
    await act(async () => {
      await result.current.history.loadOlder();
    });
    expect(fetchOlder).toHaveBeenCalledTimes(1);

    await act(async () => {
      page.resolve(range(1, 30));
      await first;
    });
    expect(result.current.history.loadingOlder).toBe(false);
    expect(result.current.messages).toHaveLength(60);
  });

  it('keeps what is shown when a page fails, says so, and asks again', async () => {
    const fetchOlder = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(range(1, 30));
    const { result } = mountLoaded(fetchOlder, range(31, 60));

    await act(async () => {
      await result.current.history.loadOlder();
    });
    expect(result.current.history.olderFailed).toBe(true);
    expect(result.current.history.hasOlder).toBe(true);
    expect(result.current.messages).toHaveLength(30);

    await act(async () => {
      await result.current.history.loadOlder();
    });
    expect(result.current.history.olderFailed).toBe(false);
    expect(ids(result.current.messages)).toEqual(ids(range(1, 60)));
  });

  it('drops an older page that lands after the room was reloaded', async () => {
    const page = deferred<Line[]>();
    const failed = deferred<Line[]>();
    const fetchOlder = jest
      .fn()
      .mockReturnValueOnce(page.promise)
      .mockReturnValueOnce(failed.promise);
    const { result } = mountLoaded(fetchOlder, range(31, 60));

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.history.loadOlder();
    });
    // A pull-to-refresh lands the newest page again before the older one returns.
    act(() => {
      result.current.setMessages(range(41, 70));
      result.current.history.startHistory(30);
    });
    expect(result.current.history.loadingOlder).toBe(false);
    await act(async () => {
      page.resolve(range(1, 30));
      await pending;
    });
    expect(ids(result.current.messages)).toEqual(ids(range(41, 70)));

    // A stale failure is dropped the same way.
    act(() => {
      pending = result.current.history.loadOlder();
    });
    act(() => result.current.history.startHistory(30));
    await act(async () => {
      failed.reject(new Error('late'));
      await pending;
    });
    expect(result.current.history.olderFailed).toBe(false);
  });

  it('asks for nothing before the room has lines', async () => {
    const fetchOlder = jest.fn();
    const { result } = mountWith(fetchOlder);
    act(() => result.current.history.startHistory(CHAT_HISTORY_PAGE));
    await act(async () => {
      await result.current.history.loadOlder();
    });
    expect(fetchOlder).not.toHaveBeenCalled();
  });

  it('loads the older page when the reader scrolls up near the top, and only then', async () => {
    const fetchOlder = jest.fn().mockResolvedValue(range(1, 30));
    const { result } = mountLoaded(fetchOlder, range(31, 60));
    const scroll = (y: number) => act(() => result.current.history.onScroll(scrollAt(y)));

    // The room's own scroll to its newest line starts at the top and moves down.
    scroll(0);
    scroll(900);
    // Up, but still far from the top.
    scroll(CHAT_HISTORY_TRIGGER_PX + 200);
    expect(fetchOlder).not.toHaveBeenCalled();

    scroll(CHAT_HISTORY_TRIGGER_PX);
    await waitFor(() => expect(result.current.messages).toHaveLength(60));
    expect(fetchOlder).toHaveBeenCalledTimes(1);
    expect(fetchOlder).toHaveBeenCalledWith(line(31).at);
  });
});
