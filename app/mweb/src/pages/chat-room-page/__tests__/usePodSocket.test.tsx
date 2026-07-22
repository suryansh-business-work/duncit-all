import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// ---- socket.io-client mock ----
type Handler = (...args: any[]) => void;

class FakeSocket {
  handlers: Record<string, Handler> = {};
  emit = vi.fn();
  disconnect = vi.fn();
  on = vi.fn((event: string, cb: Handler) => {
    this.handlers[event] = cb;
    return this;
  });
  trigger(event: string, ...args: any[]) {
    this.handlers[event]?.(...args);
  }
}

let lastSocket: FakeSocket;
const ioMock = vi.fn(() => {
  lastSocket = new FakeSocket();
  return lastSocket;
});

vi.mock('socket.io-client', () => ({
  io: (...args: any[]) => (ioMock as any)(...args),
  Socket: class {},
}));

import { usePodSocket } from '../usePodSocket';

function makeParams(overrides: Partial<Parameters<typeof usePodSocket>[0]> = {}) {
  return {
    podId: 'pod-1',
    refetch: vi.fn(),
    onMessage: vi.fn(),
    onReactionUpdate: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
}

describe('usePodSocket', () => {
  beforeEach(() => {
    ioMock.mockClear();
    localStorage.clear();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not connect without a podId', () => {
    localStorage.setItem('token', 'abc');
    renderHook(() => usePodSocket(makeParams({ podId: undefined })));
    expect(ioMock).not.toHaveBeenCalled();
  });

  it('does not connect without a token', () => {
    renderHook(() => usePodSocket(makeParams()));
    expect(ioMock).not.toHaveBeenCalled();
  });

  it('connects and joins the pod on connect', () => {
    localStorage.setItem('token', 'my-token');
    const params = makeParams();
    renderHook(() => usePodSocket(params));

    expect(ioMock).toHaveBeenCalledTimes(1);
    const [, opts] = ioMock.mock.calls[0] as any[];
    expect(opts.auth).toEqual({ token: 'my-token' });
    expect(opts.path).toBe('/socket.io');

    // fire connect -> join_pod, ack ok
    lastSocket.trigger('connect');
    expect(lastSocket.emit).toHaveBeenCalledWith('join_pod', 'pod-1', expect.any(Function));
    const ack = lastSocket.emit.mock.calls.find((c) => c[0] === 'join_pod')![2];
    ack(true);
    expect(params.onError).not.toHaveBeenCalled();
  });

  it('reports an error when join is rejected', () => {
    localStorage.setItem('token', 't');
    const params = makeParams();
    renderHook(() => usePodSocket(params));
    lastSocket.trigger('connect');
    const ack = lastSocket.emit.mock.calls.find((c) => c[0] === 'join_pod')![2];
    ack(false, 'nope');
    expect(params.onError).toHaveBeenCalledWith('nope');
    ack(false);
    expect(params.onError).toHaveBeenCalledWith('Cannot join chat');
  });

  it('routes messages only for the matching pod', () => {
    localStorage.setItem('token', 't');
    const params = makeParams();
    renderHook(() => usePodSocket(params));

    lastSocket.trigger('message', { pod_id: 'other', text: 'x' });
    expect(params.onMessage).not.toHaveBeenCalled();

    const msg = { pod_id: 'pod-1', text: 'hi' };
    lastSocket.trigger('message', msg);
    expect(params.onMessage).toHaveBeenCalledWith(msg);
  });

  it('handles reactions for the matching pod and refetches', () => {
    localStorage.setItem('token', 't');
    const params = makeParams();
    renderHook(() => usePodSocket(params));

    lastSocket.trigger('reaction', { pod_id: 'other' });
    expect(params.onReactionUpdate).not.toHaveBeenCalled();
    expect(params.refetch).not.toHaveBeenCalled();

    const r = { pod_id: 'pod-1' };
    lastSocket.trigger('reaction', r);
    expect(params.onReactionUpdate).toHaveBeenCalledWith(r);
    expect(params.refetch).toHaveBeenCalledTimes(1);
  });

  it('refetches on deleted and reports connect_error', () => {
    localStorage.setItem('token', 't');
    const params = makeParams();
    renderHook(() => usePodSocket(params));

    lastSocket.trigger('deleted');
    expect(params.refetch).toHaveBeenCalledTimes(1);

    lastSocket.trigger('connect_error', { message: 'boom' });
    expect(params.onError).toHaveBeenCalledWith('boom');

    lastSocket.trigger('connect_error', {});
    expect(params.onError).toHaveBeenCalledWith('Socket error');
  });

  it('leaves the pod and disconnects on unmount', () => {
    localStorage.setItem('token', 't');
    const params = makeParams();
    const { unmount } = renderHook(() => usePodSocket(params));
    const socket = lastSocket;
    unmount();
    expect(socket.emit).toHaveBeenCalledWith('leave_pod', 'pod-1');
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('derives the socket url from the graphql url host', () => {
    localStorage.setItem('token', 't');
    renderHook(() => usePodSocket(makeParams()));
    const [url] = ioMock.mock.calls[0] as any[];
    expect(url).toMatch(/^https?:\/\//);
  });
});
