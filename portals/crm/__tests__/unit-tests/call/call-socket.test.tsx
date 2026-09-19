import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { CRM_CALL_EVENT, getCallSocket, isTerminalCallStatus } from '@/lib/callSocket';
import { useCallSocket } from '@/hooks/useCallSocket';
import { useCallReconcile } from '@/hooks/useCallReconcile';
import { RECONCILE_CRM_CALL } from '@/api/call.gql';
import { clearToken, setToken } from '@/lib/session';
import type { FakeSocket } from './fakeSocket';

const created = vi.hoisted(() => ({ sockets: [] as FakeSocket[] }));

vi.mock('socket.io-client', async () => {
  const { createFakeSocket } = await import('./fakeSocket');
  return {
    io: vi.fn((_origin: string, options: { auth?: { token?: string } }) => {
      const socket = createFakeSocket(options);
      created.sockets.push(socket);
      return socket;
    }),
  };
});

const latest = () => created.sockets.at(-1) as FakeSocket;

afterEach(() => {
  // Signing out drops the shared socket, so every test starts from none.
  clearToken();
  getCallSocket();
  created.sockets.length = 0;
  vi.useRealTimers();
});

describe('getCallSocket', () => {
  it('opens nothing while signed out', () => {
    expect(getCallSocket()).toBeNull();
    expect(created.sockets).toHaveLength(0);
  });

  it('opens one authenticated socket and reuses it', () => {
    setToken('fixture-agent-a');

    const socket = getCallSocket();
    expect(socket).toBe(latest());
    expect(latest().auth).toEqual({ token: 'fixture-agent-a' });
    expect(getCallSocket()).toBe(socket);
    expect(created.sockets).toHaveLength(1);
    expect(latest().connect).not.toHaveBeenCalled();
  });

  it('reconnects a dropped socket instead of opening another', () => {
    setToken('fixture-agent-a');
    getCallSocket();
    latest().connected = false;

    getCallSocket();

    expect(latest().connect).toHaveBeenCalledTimes(1);
    expect(created.sockets).toHaveLength(1);
  });

  it('replaces the socket when the signed-in agent changes, and drops it on sign-out', () => {
    setToken('fixture-agent-a');
    const first = getCallSocket() as unknown as FakeSocket;

    setToken('fixture-agent-b');
    const second = getCallSocket() as unknown as FakeSocket;

    expect(first.disconnect).toHaveBeenCalledTimes(1);
    expect(second).not.toBe(first);
    expect(second.auth).toEqual({ token: 'fixture-agent-b' });

    clearToken();
    expect(getCallSocket()).toBeNull();
    expect(second.disconnect).toHaveBeenCalledTimes(1);
  });

  it('knows which statuses end a call', () => {
    expect(isTerminalCallStatus('COMPLETED')).toBe(true);
    expect(isTerminalCallStatus('NO_ANSWER')).toBe(true);
    expect(isTerminalCallStatus('RINGING')).toBe(false);
  });
});

describe('useCallSocket', () => {
  it('delivers pushed call statuses to the latest callback until unmounted', () => {
    setToken('fixture-agent-a');
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = renderHook(({ cb }) => useCallSocket(cb), { initialProps: { cb: first } });

    latest().push(CRM_CALL_EVENT, { log_id: 'log-1', status: 'RINGING' });
    expect(first).toHaveBeenCalledWith({ log_id: 'log-1', status: 'RINGING' });

    rerender({ cb: second });
    latest().push(CRM_CALL_EVENT, { log_id: 'log-1', status: 'IN_PROGRESS' });
    expect(second).toHaveBeenCalledWith({ log_id: 'log-1', status: 'IN_PROGRESS' });

    unmount();
    latest().push(CRM_CALL_EVENT, { log_id: 'log-1', status: 'COMPLETED' });
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe while signed out', () => {
    const cb = vi.fn();
    renderHook(() => useCallSocket(cb));
    expect(created.sockets).toHaveLength(0);
  });
});

describe('useCallReconcile', () => {
  type ReconcileAnswer = () => { data?: Record<string, unknown>; errors?: ReadonlyArray<{ message: string }> };

  const reconcileMock = (answer: ReconcileAnswer, delay = 0): MockedResponse => ({
    request: { query: RECONCILE_CRM_CALL, variables: { log_id: 'log-1' } },
    result: answer,
    maxUsageCount: 20,
    delay,
  });

  const statusAnswer = (status: string | null) => () => ({
    data: { reconcileCrmCall: { ok: true, message: 'synced', log_id: 'log-1', status } },
  });

  const mount = (logId: string | null, mocks: MockedResponse[]) => {
    const onStatus = vi.fn();
    const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
        {children}
      </MockedProvider>
    );
    const view = renderHook(() => useCallReconcile(logId, onStatus), { wrapper });
    return { onStatus, ...view };
  };

  const advance = async (ms: number) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  };

  it('does nothing until a call has been placed', async () => {
    vi.useFakeTimers();
    const answer = vi.fn(statusAnswer('RINGING'));
    mount(null, [reconcileMock(answer)]);

    await advance(12_000);

    expect(answer).not.toHaveBeenCalled();
  });

  it('polls every 4 s and stops once the call reaches a final status', async () => {
    vi.useFakeTimers();
    const answers = [statusAnswer('RINGING'), statusAnswer(null), statusAnswer('COMPLETED')];
    const answer = vi.fn(() => (answers.shift() ?? statusAnswer('COMPLETED'))());
    const { onStatus } = mount('log-1', [reconcileMock(answer)]);

    await advance(4_000);
    expect(onStatus).toHaveBeenLastCalledWith('RINGING');
    await advance(4_000);
    expect(onStatus).toHaveBeenCalledTimes(1);
    await advance(4_000);
    expect(onStatus).toHaveBeenLastCalledWith('COMPLETED');

    await advance(20_000);
    expect(answer).toHaveBeenCalledTimes(3);
  });

  it('gives up after four failures in a row, but a success resets the count', async () => {
    vi.useFakeTimers();
    const failure = () => ({ errors: [{ message: 'Twilio unreachable' }] });
    const answers = [failure, failure, statusAnswer('RINGING'), failure, failure, failure, failure];
    const answer = vi.fn(() => (answers.shift() ?? statusAnswer('RINGING'))());
    const { onStatus } = mount('log-1', [reconcileMock(answer)]);

    await advance(4_000 * 10);

    expect(onStatus).toHaveBeenCalledWith('RINGING');
    expect(answer).toHaveBeenCalledTimes(7);
  });

  it('stops polling when unmounted, even with a sync in flight', async () => {
    vi.useFakeTimers();
    const answer = vi.fn(statusAnswer('RINGING'));
    const { unmount } = mount('log-1', [reconcileMock(answer, 500)]);

    await advance(4_000);
    expect(answer).not.toHaveBeenCalled();
    unmount();
    await advance(20_000);

    // The in-flight sync may still land, but nothing is scheduled after it.
    expect(answer.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
