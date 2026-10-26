import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

type Handler = (...args: any[]) => void;

/** Records what the hook listens for, so a test can play the server's frames. */
class FakeSocket {
  handlers: Record<string, Handler> = {};
  emit = vi.fn();
  disconnect = vi.fn();
  on = vi.fn((event: string, cb: Handler) => {
    this.handlers[event] = cb;
    return this;
  });
  trigger(event: string, ...args: unknown[]) {
    this.handlers[event]?.(...args);
  }
}

let lastSocket: FakeSocket;
const ioMock = vi.fn((..._args: unknown[]) => {
  lastSocket = new FakeSocket();
  return lastSocket;
});
vi.mock('socket.io-client', () => ({ io: (...args: unknown[]) => ioMock(...args) }));

const warn = vi.hoisted(() => vi.fn());
vi.mock('@duncit/logs', () => ({ logs: { mWeb: { warn } } }));

import { useVenueChatSocket } from '../useVenueChatSocket';

const handlersFor = (podId: string | undefined = 'pod-1') => ({
  podId,
  onLine: vi.fn(),
  onRemoved: vi.fn(),
  onRead: vi.fn(),
  onJoinFailed: vi.fn(),
});

/** The ack the join was sent with — what the server calls back. */
const joinAck = () => {
  lastSocket.trigger('connect');
  const join = lastSocket.emit.mock.calls.find(([event]) => event === 'join_venue_chat');
  expect(join?.[1]).toBe('pod-1');
  return join?.[2] as (ok: boolean, err?: string) => void;
};

beforeEach(() => {
  localStorage.setItem('token', 'tok-1');
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('useVenueChatSocket', () => {
  it('connects nothing until the pod is known, or without a session', () => {
    // Spread over the handlers: handlersFor(undefined) would take its 'pod-1' default.
    renderHook(() => useVenueChatSocket({ ...handlersFor(), podId: undefined }));
    localStorage.clear();
    renderHook(() => useVenueChatSocket(handlersFor()));
    expect(ioMock).not.toHaveBeenCalled();
  });

  it('joins the thread with the session token once connected', () => {
    const handlers = handlersFor();
    renderHook(() => useVenueChatSocket(handlers));
    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(ioMock.mock.calls[0][1]).toMatchObject({ path: '/socket.io', auth: { token: 'tok-1' } });

    joinAck()(true);
    expect(handlers.onJoinFailed).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("reports a refused join with the server's code, or ERROR when it names none", () => {
    const handlers = handlersFor();
    renderHook(() => useVenueChatSocket(handlers));
    const ack = joinAck();

    ack(false, 'FORBIDDEN');
    ack(false);

    expect(handlers.onJoinFailed.mock.calls).toEqual([['FORBIDDEN'], ['ERROR']]);
    expect(warn).toHaveBeenCalledWith('venueChat', 'join', { podId: 'pod-1', code: 'FORBIDDEN' });
  });

  it('hands a new line and a changed line alike to onLine', () => {
    const handlers = handlersFor();
    renderHook(() => useVenueChatSocket(handlers));
    const fresh = { id: 'l1', text: 'Hello' };
    const edited = { id: 'l1', text: 'Hello again', edited_at: '2026-12-01T06:05:00.000Z' };

    lastSocket.trigger('venue_chat_message', fresh);
    lastSocket.trigger('venue_chat_update', edited);

    expect(handlers.onLine.mock.calls).toEqual([[fresh], [edited]]);
    expect(handlers.onRemoved).not.toHaveBeenCalled();
  });

  it('hands a removal over as the id alone, and a read mark as it came', () => {
    const handlers = handlersFor();
    renderHook(() => useVenueChatSocket(handlers));
    const mark = { user_id: 'u-venue', side: 'VENUE', name: 'Ravi', photo: null, last_read_at: '2026-12-01T06:02:00.000Z' };

    lastSocket.trigger('venue_chat_delete', { id: 'l2', pod_id: 'pod-1' });
    lastSocket.trigger('venue_chat_read', mark);

    expect(handlers.onRemoved).toHaveBeenCalledWith('l2');
    expect(handlers.onRead).toHaveBeenCalledWith(mark);
    expect(handlers.onLine).not.toHaveBeenCalled();
  });

  it('reports a socket that cannot connect', () => {
    const handlers = handlersFor();
    renderHook(() => useVenueChatSocket(handlers));
    const error = new Error('xhr poll error');

    lastSocket.trigger('connect_error', error);

    expect(handlers.onJoinFailed).toHaveBeenCalledWith('ERROR');
    expect(warn).toHaveBeenCalledWith('venueChat', 'connect', { podId: 'pod-1', error });
  });

  it('calls the newest handlers without reconnecting, and leaves the thread on unmount', () => {
    const first = handlersFor();
    const { rerender, unmount } = renderHook((handlers) => useVenueChatSocket(handlers), { initialProps: first });
    const next = handlersFor();
    rerender(next);

    lastSocket.trigger('venue_chat_delete', { id: 'l3' });
    expect(next.onRemoved).toHaveBeenCalledWith('l3');
    expect(first.onRemoved).not.toHaveBeenCalled();
    expect(ioMock).toHaveBeenCalledTimes(1);

    const socket = lastSocket;
    unmount();
    expect(socket.emit).toHaveBeenCalledWith('leave_venue_chat', 'pod-1');
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
});
