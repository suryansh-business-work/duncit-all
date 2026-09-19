import { vi } from 'vitest';

/**
 * A socket.io client stand-in: records its handshake options, and lets a test
 * push a server event to whatever the app subscribed with `on`.
 */
export interface FakeSocket {
  auth: { token?: string };
  connected: boolean;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  /** Deliver a server-pushed event to the current subscribers. */
  push: (event: string, payload: unknown) => void;
}

export function createFakeSocket(options: { auth?: { token?: string } } = {}): FakeSocket {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  const subscribers = (event: string) => {
    const existing = handlers.get(event);
    if (existing) return existing;
    const created = new Set<(payload: unknown) => void>();
    handlers.set(event, created);
    return created;
  };
  return {
    auth: options.auth ?? {},
    connected: true,
    on: vi.fn((event: string, fn: (payload: unknown) => void) => {
      subscribers(event).add(fn);
    }),
    off: vi.fn((event: string, fn: (payload: unknown) => void) => {
      subscribers(event).delete(fn);
    }),
    connect: vi.fn(),
    disconnect: vi.fn(),
    push: (event, payload) => {
      for (const fn of subscribers(event)) fn(payload);
    },
  };
}
