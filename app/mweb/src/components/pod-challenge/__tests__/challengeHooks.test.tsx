import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';

import { useCoalescedRefetch } from '../useCoalescedRefetch';
import { useChallengeSocket } from '../useChallengeSocket';
import { usePodChallengeLive } from '../usePodChallengeLive';
import { useChallengeToolActions } from '../useChallengeToolActions';
import ChallengeClock from '../ChallengeClock';
import ShareChallengeButton from '../ShareChallengeButton';
import ToolCard, { ToolNote } from '../ToolCard';
import { ballotToolsOf, judgeToolsOf, leadersOf, parseConfig, roundToolOf, timersOf } from '../challengeView';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  io: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  watch: vi.fn(),
}));

vi.mock('socket.io-client', () => ({ io: h.io }));
vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useQuery: h.useQuery, useMutation: h.useMutation }));
vi.mock('../../notify', () => ({ notifySuccess: h.success, notifyError: h.error }));
vi.mock('../../../lib/socket-url', () => ({ getSocketUrl: () => 'https://socket.test' }));
vi.mock('@duncit/utils', async (orig) => ({ ...(await orig<object>()), watchChallenge: h.watch }));
vi.mock('@duncit/logs', async (orig) => {
  const real = await orig<typeof import('@duncit/logs')>();
  return { ...real, logs: { ...real.logs, mWeb: { ...real.logs.mWeb, warn: h.warn } } };
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('challengeView readers', () => {
  const tools = [
    { input_kind: 'CLOCK' },
    { input_kind: 'VOTE' },
    { input_kind: 'RATE' },
    { input_kind: 'JUDGE' },
    { input_kind: 'ROUND' },
    { input_kind: 'POLL' },
  ] as never[];

  it('groups tools by how they are fed', () => {
    expect(timersOf(tools)).toHaveLength(1);
    expect(ballotToolsOf(tools).map((t) => (t as { input_kind: string }).input_kind)).toEqual(['VOTE', 'RATE']);
    expect(judgeToolsOf(tools)).toHaveLength(1);
    expect((roundToolOf(tools) as unknown as { input_kind: string }).input_kind).toBe('ROUND');
    expect(roundToolOf([{ input_kind: 'CLOCK' }] as never[])).toBeUndefined();
  });

  it('lists the rank-one names as the leaders, including ties', () => {
    expect(leadersOf([{ rank: 1, name: 'A' }, { rank: 1, name: 'B' }, { rank: 3, name: 'C' }])).toEqual(['A', 'B']);
    expect(leadersOf([])).toEqual([]);
  });

  it('parses a tool config and tolerates junk', () => {
    expect(parseConfig('{"mode":"COUNTDOWN"}')).toEqual({ mode: 'COUNTDOWN' });
    expect(parseConfig('not json')).toEqual({});
    expect(parseConfig(null)).toEqual({});
  });
});

describe('useCoalescedRefetch', () => {
  it('folds requests made while one is in flight into a single follow-up', async () => {
    let finish: () => void = () => undefined;
    const refetch = vi.fn().mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve))).mockResolvedValue(undefined);
    const { result } = renderHook(() => useCoalescedRefetch(refetch));
    act(() => {
      result.current();
      result.current();
      result.current();
    });
    expect(refetch).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(2));
  });

  it('does not run a follow-up when nothing arrived meanwhile', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useCoalescedRefetch(refetch));
    await act(async () => {
      result.current();
    });
    await act(async () => {
      result.current();
    });
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('logs a failed refetch and can refetch again afterwards', async () => {
    const error = new Error('down');
    const refetch = vi.fn().mockRejectedValueOnce(error).mockResolvedValue(undefined);
    const { result } = renderHook(() => useCoalescedRefetch(refetch));
    await act(async () => {
      result.current();
    });
    expect(h.warn).toHaveBeenCalledWith('pod-challenge', 'refetch', { error });
    await act(async () => {
      result.current();
    });
    expect(refetch).toHaveBeenCalledTimes(2);
  });
});

describe('useChallengeSocket', () => {
  const fakeSocket = () => ({ on: vi.fn(), off: vi.fn(), disconnect: vi.fn() });

  it('does not connect without a session token or without challenges', () => {
    renderHook(() => useChallengeSocket(['c1'], () => 1, vi.fn()));
    localStorage.setItem('token', 't');
    renderHook(() => useChallengeSocket([], () => 1, vi.fn()));
    expect(h.io).not.toHaveBeenCalled();
  });

  it('connects with the token, watches each room, and reports live while connected', () => {
    localStorage.setItem('token', 'tok');
    const socket = fakeSocket();
    h.io.mockReturnValue(socket);
    const stopA = vi.fn();
    const stopB = vi.fn();
    h.watch.mockReturnValueOnce(stopA).mockReturnValueOnce(stopB);
    const onStale = vi.fn();
    const { result, unmount } = renderHook(() => useChallengeSocket(['a', 'b'], (id) => (id === 'a' ? 3 : 4), onStale));
    expect(h.io).toHaveBeenCalledWith('https://socket.test', {
      path: '/socket.io',
      auth: { token: 'tok' },
      transports: ['websocket', 'polling'],
    });
    expect(result.current).toBe(false);
    const handlers = Object.fromEntries(socket.on.mock.calls.map(([event, fn]) => [event, fn]));
    act(() => handlers.connect());
    expect(result.current).toBe(true);
    act(() => handlers.disconnect());
    expect(result.current).toBe(false);
    // The watcher is handed the current revision and the stale callback of its own room.
    const [, id, revisionOf, stale] = h.watch.mock.calls[0];
    expect(id).toBe('a');
    expect(revisionOf()).toBe(3);
    stale();
    expect(onStale).toHaveBeenCalledWith('a');
    expect(h.watch.mock.calls[1][3]).toBeInstanceOf(Function);
    unmount();
    expect(stopA).toHaveBeenCalled();
    expect(stopB).toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.off).toHaveBeenCalledWith('connect', handlers.connect);
  });
});

describe('usePodChallengeLive', () => {
  const query = (over: object = {}) => {
    const q = {
      data: { podChallenge: { id: 'c1', status: 'LIVE', revision: 2, server_now: '2026-06-01T10:00:00.000Z' } },
      loading: false,
      error: undefined,
      refetch: vi.fn().mockResolvedValue(undefined),
      startPolling: vi.fn(),
      stopPolling: vi.fn(),
      ...over,
    };
    h.useQuery.mockReturnValue(q);
    return q;
  };

  it('polls while there is no live socket and stops on unmount', () => {
    h.io.mockReturnValue({ on: vi.fn(), off: vi.fn(), disconnect: vi.fn() });
    const q = query();
    const { result, unmount } = renderHook(() => usePodChallengeLive('c1'));
    expect(result.current.challenge?.id).toBe('c1');
    expect(result.current.loading).toBe(false);
    expect(result.current.live).toBe(false);
    expect(q.startPolling).toHaveBeenCalledWith(5000);
    unmount();
    expect(q.stopPolling).toHaveBeenCalled();
  });

  it('does not poll a finished challenge', () => {
    const q = query({ data: { podChallenge: { id: 'c1', status: 'COMPLETED', revision: 9, server_now: null } } });
    renderHook(() => usePodChallengeLive('c1'));
    expect(q.startPolling).not.toHaveBeenCalled();
  });

  it('skips everything without a challenge id and reports loading only while nothing is cached', () => {
    const q = query({ data: undefined, loading: true });
    const { result } = renderHook(() => usePodChallengeLive(''));
    expect(h.useQuery.mock.calls[0][1]).toMatchObject({ skip: true });
    expect(q.startPolling).not.toHaveBeenCalled();
    expect(result.current.challenge).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('surfaces the error only while there is no challenge to show', () => {
    query({ data: undefined, error: new Error('boom') });
    expect(renderHook(() => usePodChallengeLive('c1')).result.current.error).toBeInstanceOf(Error);
    query({ error: new Error('boom') });
    expect(renderHook(() => usePodChallengeLive('c1')).result.current.error).toBeUndefined();
  });

  it('refreshes through a coalesced refetch', async () => {
    const q = query();
    const { result } = renderHook(() => usePodChallengeLive('c1'));
    await act(async () => {
      result.current.reload();
    });
    expect(q.refetch).toHaveBeenCalledTimes(1);
  });
});

describe('useChallengeToolActions', () => {
  const mutations = (over: Record<number, ReturnType<typeof vi.fn>> = {}, loadingIndex = -1) => {
    const fns = Array.from({ length: 6 }, (_, i) => over[i] ?? vi.fn().mockResolvedValue({}));
    let call = 0;
    h.useMutation.mockImplementation(() => {
      const i = call++ % 6;
      return [fns[i], { loading: i === loadingIndex }];
    });
    return fns;
  };

  it('runs each action with the challenge id and confirms success', async () => {
    const [poll, answer, buzz, submit, remove, checkpoint] = mutations();
    const { result } = renderHook(() => useChallengeToolActions('c1'));
    await act(async () => {
      expect(await result.current.poll('t1', 'optA')).toBe(true);
      expect(await result.current.answer('t2', 3)).toBe(true);
      expect(await result.current.buzz('t3')).toBe(true);
      expect(await result.current.submit('t4', { text: 'hi' } as never)).toBe(true);
      expect(await result.current.removeEntry('e1')).toBe(true);
      expect(await result.current.checkpoint('t5', 'CODE')).toBe(true);
    });
    expect(poll).toHaveBeenCalledWith({ variables: { id: 'c1', toolInstanceId: 't1', optionKey: 'optA' } });
    expect(answer).toHaveBeenCalledWith({ variables: { id: 'c1', toolInstanceId: 't2', optionIndex: 3 } });
    expect(buzz).toHaveBeenCalledWith({ variables: { id: 'c1', toolInstanceId: 't3' } });
    expect(submit).toHaveBeenCalledWith({ variables: { id: 'c1', toolInstanceId: 't4', input: { text: 'hi' } } });
    expect(remove).toHaveBeenCalledWith({ variables: { entryId: 'e1' } });
    expect(checkpoint).toHaveBeenCalledWith({ variables: { id: 'c1', toolInstanceId: 't5', code: 'CODE' } });
    expect(h.success).toHaveBeenCalledWith(fallbackT('mweb.challenge.ballotSaved'));
    expect(h.success).toHaveBeenCalledWith(fallbackT('mweb.challenge.tools.checkpointReached'));
    expect(h.success).toHaveBeenCalledTimes(6);
  });

  it('shows the server reason for a refused action and reports false', async () => {
    mutations({ 2: vi.fn().mockRejectedValue(new Error('Buzzers are closed')) });
    const { result } = renderHook(() => useChallengeToolActions('c1'));
    let ok = true;
    await act(async () => {
      ok = await result.current.buzz('t3');
    });
    expect(ok).toBe(false);
    expect(h.error).toHaveBeenCalledWith('Buzzers are closed');
    expect(h.success).not.toHaveBeenCalled();
  });

  it('is busy while any one mutation is running', () => {
    mutations({}, 3);
    expect(renderHook(() => useChallengeToolActions('c1')).result.current.busy).toBe(true);
    mutations();
    expect(renderHook(() => useChallengeToolActions('c1')).result.current.busy).toBe(false);
  });
});

describe('ChallengeClock', () => {
  afterEach(() => vi.useRealTimers());

  const clock = (over: object = {}) => ({
    label: 'Round clock',
    config_json: '{"mode":"COUNTDOWN","duration_seconds":120}',
    clock_running: false,
    clock_elapsed_ms: 30_000,
    ...over,
  });

  it('shows the countdown remaining and says it is stopped', () => {
    render(<ChallengeClock tool={clock() as never} receivedAt={Date.now()} />);
    expect(screen.getByRole('timer')).toHaveTextContent('01:30');
    expect(screen.getByRole('timer')).toHaveAccessibleName(`Round clock: 01:30, ${fallbackT('mweb.challenge.clockStopped')}`);
  });

  it('shows stopwatch elapsed time by default, without a config', () => {
    render(<ChallengeClock tool={clock({ config_json: null }) as never} receivedAt={Date.now()} large />);
    expect(screen.getByRole('timer')).toHaveTextContent('00:30');
  });

  it('ticks forward every second while running', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T10:00:00.000Z'));
    render(<ChallengeClock tool={clock({ clock_running: true }) as never} receivedAt={Date.now()} />);
    expect(screen.getByRole('timer')).toHaveTextContent('01:30');
    expect(screen.getByRole('timer')).toHaveAccessibleName(expect.stringContaining(fallbackT('mweb.challenge.clockRunning')));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('01:25');
  });

  it('never counts below zero', () => {
    render(<ChallengeClock tool={clock({ clock_elapsed_ms: 500_000 }) as never} receivedAt={Date.now()} />);
    expect(screen.getByRole('timer')).toHaveTextContent('00:00');
  });
});

describe('ShareChallengeButton', () => {
  const press = () => fireEvent.click(screen.getByRole('button'));
  const mount = () => render(<ShareChallengeButton podId="p1" challengeId="c1" name="Quiz night" />);
  const url = () => `${globalThis.location.origin}/pod/p1/challenges/c1/live`;

  afterEach(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });

  it('uses the native share sheet with the live link', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    mount();
    press();
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: 'Quiz night', url: url() }));
    expect(h.success).not.toHaveBeenCalled();
  });

  it('stays quiet when the person closes the share sheet', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    mount();
    press();
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(writeText).not.toHaveBeenCalled();
    expect(h.error).not.toHaveBeenCalled();
  });

  it('copies the link when sharing fails for another reason, or is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(navigator, 'share', { value: vi.fn().mockRejectedValue(new Error('nope')), configurable: true });
    const { unmount } = mount();
    press();
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(url()));
    expect(h.success).toHaveBeenCalledWith(fallbackT('mweb.challenge.linkCopied'));
    unmount();
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    mount();
    press();
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
  });

  it('tells the person when the link could not be copied', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }, configurable: true });
    mount();
    press();
    await waitFor(() => expect(h.error).toHaveBeenCalledWith(fallbackT('mweb.challenge.linkCopyFailed')));
    expect(h.warn).toHaveBeenCalledWith('pod-challenge', 'share', expect.any(Object));
  });
});

describe('ToolCard', () => {
  it('frames a tool with its title as a labelled section, and renders notes', () => {
    render(
      <ToolCard icon={<i data-testid="icon" />} title="Live poll">
        <ToolNote>Voting is open</ToolNote>
      </ToolCard>
    );
    expect(screen.getByRole('region', { name: 'Live poll' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Live poll' })).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Voting is open')).toBeInTheDocument();
  });
});
