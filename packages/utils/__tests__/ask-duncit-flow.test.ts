/**
 * The steps mWeb and the native app share around the Ask Duncit thread:
 * opening a conversation, paging older messages, and the mic button.
 */
import { describe, expect, it, vi } from 'vitest';
import { emptyThread, type AskDuncitMessageView, type AskDuncitThreadState } from '../src/ask-duncit';
import { appendHeard, loadOlderAskDuncit, openAskDuncitThread, toggleAskDuncitMic, type AskDuncitPage } from '../src/ask-duncit-flow';

const msg = (id: string): AskDuncitMessageView => ({
  id,
  role: 'user',
  content: id,
  status: 'COMPLETE',
  attachments: [],
  tool_calls: [],
  actions: [],
  created_at: '2026-11-22T10:00:00.000Z',
});

/** A setter that applies updates like React's, so the test reads the resulting state. */
function harness(initial: AskDuncitThreadState) {
  let thread = initial;
  const loading: boolean[] = [];
  const loadError: boolean[] = [];
  const onError = vi.fn();
  const io = {
    setThread: (next: AskDuncitThreadState | ((prev: AskDuncitThreadState) => AskDuncitThreadState)) => {
      thread = typeof next === 'function' ? next(thread) : next;
    },
    setLoading: (v: boolean) => loading.push(v),
    setLoadError: (v: boolean) => loadError.push(v),
    onError,
  };
  return { io, loading, loadError, onError, thread: () => thread };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('openAskDuncitThread', () => {
  it('loads the newest page of a conversation and stops loading', async () => {
    const h = harness(emptyThread(null));
    const fetchPage = vi.fn(async (): Promise<AskDuncitPage> => ({ items: [msg('m1'), msg('m2')], hasMore: true }));
    openAskDuncitThread('c1', h.thread(), fetchPage, h.io);
    await settle();
    expect(fetchPage).toHaveBeenCalledWith('c1');
    expect(h.thread()).toMatchObject({ conversationId: 'c1', hasMore: true });
    expect(h.thread().messages.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(h.loading).toEqual([true, false]);
    expect(h.loadError).toEqual([false]);
  });

  it('clears the thread for a new chat without fetching', () => {
    const h = harness({ ...emptyThread('c1'), messages: [msg('m1')] });
    const fetchPage = vi.fn();
    openAskDuncitThread(null, h.thread(), fetchPage, h.io);
    expect(h.thread()).toEqual(emptyThread(null));
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('keeps the conversation already on screen instead of reloading it', () => {
    const shown = { ...emptyThread('c1'), messages: [msg('m1')] };
    const h = harness(shown);
    const fetchPage = vi.fn();
    openAskDuncitThread('c1', shown, fetchPage, h.io);
    expect(fetchPage).not.toHaveBeenCalled();
    expect(h.thread()).toBe(shown);
  });

  it('reports a failed load and flags the error', async () => {
    const h = harness(emptyThread(null));
    const boom = new Error('offline');
    openAskDuncitThread('c1', h.thread(), () => Promise.reject(boom), h.io);
    await settle();
    expect(h.onError).toHaveBeenCalledWith(boom);
    expect(h.loadError).toEqual([false, true]);
    expect(h.loading).toEqual([true, false]);
  });

  it('ignores a page (or a failure) that arrives after the screen moved on', async () => {
    const ok = harness(emptyThread(null));
    openAskDuncitThread('c1', ok.thread(), async () => ({ items: [msg('m1')], hasMore: false }), ok.io)();
    const bad = harness(emptyThread(null));
    openAskDuncitThread('c2', bad.thread(), () => Promise.reject(new Error('x')), bad.io)();
    await settle();
    expect(ok.thread()).toEqual(emptyThread(null));
    expect(ok.loading).toEqual([true]);
    expect(bad.loadError).toEqual([false]);
    expect(bad.onError).toHaveBeenCalled();
  });
});

describe('loadOlderAskDuncit', () => {
  const shown = (): AskDuncitThreadState => ({ ...emptyThread('c1'), messages: [msg('temp-1'), msg('m5'), msg('m6')], hasMore: true });

  it('asks for the page before the oldest stored message and prepends it', async () => {
    const h = harness(shown());
    const fetchPage = vi.fn(async (): Promise<AskDuncitPage> => ({ items: [msg('m3'), msg('m4')], hasMore: false }));
    await loadOlderAskDuncit(h.thread(), false, fetchPage, h.io);
    expect(fetchPage).toHaveBeenCalledWith('c1', 'm5');
    expect(h.thread().messages.map((m) => m.id)).toEqual(['m3', 'm4', 'temp-1', 'm5', 'm6']);
    expect(h.thread().hasMore).toBe(false);
    expect(h.loading).toEqual([true, false]);
  });

  it('does nothing while busy, with no conversation, or with nothing older', async () => {
    const fetchPage = vi.fn();
    const h = harness(shown());
    await loadOlderAskDuncit(shown(), true, fetchPage, h.io);
    await loadOlderAskDuncit(emptyThread(null), false, fetchPage, h.io);
    await loadOlderAskDuncit({ ...shown(), hasMore: false }, false, fetchPage, h.io);
    expect(fetchPage).not.toHaveBeenCalled();
    expect(h.loading).toEqual([]);
  });

  it('reports a failed page and stops loading', async () => {
    const h = harness({ ...emptyThread('c1'), messages: [msg('temp-1')], hasMore: true });
    const boom = new Error('offline');
    const fetchPage = vi.fn(() => Promise.reject(boom));
    await loadOlderAskDuncit(h.thread(), false, fetchPage, h.io);
    expect(fetchPage).toHaveBeenCalledWith('c1', undefined);
    expect(h.onError).toHaveBeenCalledWith(boom);
    expect(h.loading).toEqual([true, false]);
  });
});

describe('the mic button', () => {
  it('starts recording, and reports why the microphone was refused', async () => {
    const onHeard = vi.fn();
    expect(await toggleAskDuncitMic(false, { start: async () => null, stop: vi.fn() }, onHeard)).toBeNull();
    expect(await toggleAskDuncitMic(false, { start: async () => 'PERMISSION', stop: vi.fn() }, onHeard)).toBe('askDuncit.voice.error.PERMISSION');
    expect(onHeard).not.toHaveBeenCalled();
  });

  it('stops and hands over what was heard, or reports that nothing was', async () => {
    const onHeard = vi.fn();
    expect(await toggleAskDuncitMic(true, { start: vi.fn(), stop: async () => 'kal ke pods' }, onHeard)).toBeNull();
    expect(onHeard).toHaveBeenCalledWith('kal ke pods');
    expect(await toggleAskDuncitMic(true, { start: vi.fn(), stop: async () => null }, onHeard)).toBe('askDuncit.voice.error.FAILED');
    expect(onHeard).toHaveBeenCalledTimes(1);
  });

  it('puts dictated text after what is already typed', () => {
    expect(appendHeard('', 'hello')).toBe('hello');
    expect(appendHeard('Show my', 'pods')).toBe('Show my pods');
  });
});
