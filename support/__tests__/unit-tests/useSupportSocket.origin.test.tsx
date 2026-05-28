import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { appConfig } from '../../src/config/app-config';
import { useSupportSocket } from '../../src/lib/useSupportSocket';

const sock = vi.hoisted(() => {
  const socket = {
    on: vi.fn(),
    emit: vi.fn(),
    removeAllListeners: vi.fn(),
    disconnect: vi.fn(),
  };
  return { socket, io: vi.fn(() => socket) };
});

vi.mock('socket.io-client', () => ({ io: sock.io }));
// Force socketOrigin() down its catch branch with an unparseable URL.
vi.mock('../../src/config/url-configs', () => ({
  urlConfigs: { isDevelopment: true, graphqlUrl: 'not a valid url', appUrl: '' },
}));

beforeEach(() => {
  sock.io.mockClear();
  localStorage.setItem(appConfig.tokenKey, 'tok');
});

afterEach(() => localStorage.clear());

describe('useSupportSocket socket origin', () => {
  it('falls back to localhost when the GraphQL URL cannot be parsed', () => {
    renderHook(() => useSupportSocket({}));
    expect(sock.io).toHaveBeenCalledWith('http://localhost:2001', expect.objectContaining({ path: '/socket.io' }));
  });
});
