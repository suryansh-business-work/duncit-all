import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mutable url-config mock so we can exercise both the parse and catch branches.
const urlConfigsMock = { graphqlUrl: 'http://localhost:2001/graphql' };
vi.mock('../../../config/url-configs', () => ({
  get urlConfigs() {
    return urlConfigsMock;
  },
}));

// Capture the socket the hook creates.
const handlers: Record<string, (...args: unknown[]) => void> = {};
const disconnect = vi.fn();
const on = vi.fn((event: string, cb: (...args: unknown[]) => void) => {
  handlers[event] = cb;
});
const ioMock = vi.fn(() => ({ on, disconnect }));
vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
  Socket: class {},
}));

import { useTicketSocket } from '../useTicketSocket';

describe('useTicketSocket', () => {
  beforeEach(() => {
    urlConfigsMock.graphqlUrl = 'http://localhost:2001/graphql';
    for (const k of Object.keys(handlers)) delete handlers[k];
    ioMock.mockClear();
    on.mockClear();
    disconnect.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('does nothing when ticketId is undefined', () => {
    localStorage.setItem('token', 'tok');
    renderHook(() => useTicketSocket(undefined, vi.fn()));
    expect(ioMock).not.toHaveBeenCalled();
  });

  it('does nothing when there is no token', () => {
    renderHook(() => useTicketSocket('t1', vi.fn()));
    expect(ioMock).not.toHaveBeenCalled();
  });

  it('connects and derives the socket url from the graphql url', () => {
    localStorage.setItem('token', 'tok');
    renderHook(() => useTicketSocket('t1', vi.fn()));
    expect(ioMock).toHaveBeenCalledTimes(1);
    const [url, opts] = ioMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe('http://localhost:2001');
    expect(opts).toMatchObject({
      path: '/socket.io',
      auth: { token: 'tok' },
      transports: ['websocket', 'polling'],
    });
    expect(on).toHaveBeenCalledWith('ticket:update', expect.any(Function));
  });

  it('falls back to window origin when the graphql url is invalid', () => {
    localStorage.setItem('token', 'tok');
    urlConfigsMock.graphqlUrl = 'not-a-valid-url';
    renderHook(() => useTicketSocket('t1', vi.fn()));
    const [url] = ioMock.mock.calls[0] as [string];
    expect(url).toBe(globalThis.window.location.origin);
  });

  it('invokes onUpdate only for a matching ticket id', () => {
    localStorage.setItem('token', 'tok');
    const onUpdate = vi.fn();
    renderHook(() => useTicketSocket('t1', onUpdate));

    handlers['ticket:update']({ id: 'other' });
    expect(onUpdate).not.toHaveBeenCalled();

    handlers['ticket:update'](undefined);
    expect(onUpdate).not.toHaveBeenCalled();

    handlers['ticket:update']({ id: 't1' });
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('uses the latest onUpdate callback via the ref', () => {
    localStorage.setItem('token', 'tok');
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useTicketSocket('t1', cb), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });
    handlers['ticket:update']({ id: 't1' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('disconnects the socket on unmount', () => {
    localStorage.setItem('token', 'tok');
    const { unmount } = renderHook(() => useTicketSocket('t1', vi.fn()));
    expect(disconnect).not.toHaveBeenCalled();
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
