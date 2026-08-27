import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { SocketLike } from '@duncit/user-core';
import { configureSessionSocket, useUserRealtime } from '../src/useUserRealtime';

type Handler = (payload: unknown) => void;

/** A plain emitter shaped like socket.io-client: `on` records, `emit` replays. */
function fakeSocket(withDisconnect = true) {
  const handlers = new Map<string, Handler>();
  const socket: SocketLike & { emit: (event: string, payload: unknown) => void } = {
    on: vi.fn((event: string, handler: Handler) => {
      handlers.set(event, handler);
    }),
    off: vi.fn((event: string) => {
      handlers.delete(event);
    }),
    emit: (event, payload) => handlers.get(event)?.(payload),
  };
  if (withDisconnect) socket.disconnect = vi.fn();
  return socket;
}

afterEach(() => {
  configureSessionSocket(null);
});

describe('useUserRealtime', () => {
  it('opens nothing until a socket factory is configured', () => {
    const apply = vi.fn();
    const { unmount } = renderHook(() => useUserRealtime('u1', apply));
    unmount();
    expect(apply).not.toHaveBeenCalled();
  });

  it('opens nothing while signed out, even with a factory', () => {
    const factory = vi.fn(() => fakeSocket());
    configureSessionSocket(factory);
    renderHook(() => useUserRealtime(null, vi.fn()));
    expect(factory).not.toHaveBeenCalled();
  });

  it('opens nothing when the factory reports no transport', () => {
    const factory = vi.fn(() => null);
    configureSessionSocket(factory);
    const { unmount } = renderHook(() => useUserRealtime('u1', vi.fn()));
    expect(factory).toHaveBeenCalledTimes(1);
    expect(() => unmount()).not.toThrow();
  });

  it('applies this user\'s patches and signs out on revocation', () => {
    const socket = fakeSocket();
    configureSessionSocket(() => socket);
    const apply = vi.fn();
    const onRevoked = vi.fn();
    renderHook(() => useUserRealtime('u1', apply, onRevoked));

    act(() => {
      socket.emit('user:changed', { user_id: 'u1', patch: { first_name: 'Neo', user_id: 'x' } });
    });
    expect(apply).toHaveBeenCalledWith({ first_name: 'Neo' });

    act(() => {
      socket.emit('user:changed', { user_id: 'someone-else', patch: { first_name: 'Not me' } });
    });
    expect(apply).toHaveBeenCalledTimes(1);

    act(() => {
      socket.emit('session:revoked', { user_id: 'u1', reason: 'ACCOUNT_DELETION_REQUESTED' });
    });
    expect(onRevoked).toHaveBeenCalledTimes(1);
  });

  it('tolerates a revocation when no onRevoked was given', () => {
    const socket = fakeSocket();
    configureSessionSocket(() => socket);
    renderHook(() => useUserRealtime('u1', vi.fn()));
    expect(() =>
      act(() => {
        socket.emit('session:revoked', { user_id: 'u1', reason: 'ACCOUNT_DELETION_REQUESTED' });
      }),
    ).not.toThrow();
  });

  it('owns the connection: unsubscribes both frames and disconnects on unmount', () => {
    const socket = fakeSocket();
    configureSessionSocket(() => socket);
    const { unmount } = renderHook(() => useUserRealtime('u1', vi.fn()));
    expect(socket.on).toHaveBeenCalledWith('user:changed', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('session:revoked', expect.any(Function));

    unmount();
    expect(socket.off).toHaveBeenCalledWith('user:changed', expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith('session:revoked', expect.any(Function));
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('copes with a plain emitter that has no disconnect', () => {
    const socket = fakeSocket(false);
    configureSessionSocket(() => socket);
    const { unmount } = renderHook(() => useUserRealtime('u1', vi.fn()));
    expect(() => unmount()).not.toThrow();
    expect(socket.off).toHaveBeenCalledTimes(2);
  });

  it('rebuilds the socket when the signed-in user changes', () => {
    const first = fakeSocket();
    const second = fakeSocket();
    const factory = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    configureSessionSocket(factory);
    const { rerender } = renderHook(({ id }: { id: string | null }) => useUserRealtime(id, vi.fn()), {
      initialProps: { id: 'u1' },
    });
    rerender({ id: 'u2' });
    expect(first.disconnect).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(second.on).toHaveBeenCalledWith('user:changed', expect.any(Function));
  });
});
