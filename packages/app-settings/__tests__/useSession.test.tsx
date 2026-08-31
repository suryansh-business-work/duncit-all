// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const { useQueryMock, useUserDataMock, useDeviceInfoMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useUserDataMock: vi.fn(),
  useDeviceInfoMock: vi.fn(),
}));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: useQueryMock,
}));

vi.mock('@duncit/user-context', () => ({
  useUserData: useUserDataMock,
  useDeviceInfo: useDeviceInfoMock,
}));

// Import AFTER the mocks are registered.
const { useSession } = await import('../src/useSession');

const DEVICE = {
  duid: 'duid-web-4821',
  platform: 'web',
  os: 'Mozilla/5.0',
  model: '1920x1080',
  app_version: '1.72.9',
  timezone: 'Asia/Kolkata',
};

const ME = {
  user_id: '66f1a2b3c4d5e6f708192a3b',
  first_name: 'Aarav',
  last_name: 'Sharma',
  email: 'aarav.sharma@duncit.com',
  phone_number: '9876543210',
  roles: ['HOST', 'CLUB_ADMIN'],
  locale: 'en-IN',
  city: 'Mumbai',
};

const FLAG_DATA = {
  publicFeatureFlags: [
    { key: 'gift_cards', enabled: true },
    { key: 'auto_pods', enabled: false },
  ],
};

const refetch = vi.fn(async () => 'refetched');
const logout = vi.fn();

const withUserData = (over: Partial<{ user: unknown; loading: boolean; error: Error | null }>) => {
  useUserDataMock.mockReturnValue({
    user: null,
    loading: false,
    error: null,
    refetch,
    logout,
    ...over,
  });
};

beforeEach(() => {
  useQueryMock.mockReset();
  useUserDataMock.mockReset();
  useDeviceInfoMock.mockReset();
  useQueryMock.mockReturnValue({ data: FLAG_DATA, loading: false });
  useDeviceInfoMock.mockReturnValue(DEVICE);
});

describe('useSession', () => {
  it('derives the full snapshot for a signed-in account', () => {
    withUserData({ user: ME });
    const { result } = renderHook(() => useSession());
    const s = result.current;

    expect(s.status).toBe('authenticated');
    expect(s.isAuthenticated).toBe(true);
    expect(s.user?.user_id).toBe('66f1a2b3c4d5e6f708192a3b');
    expect(s.name).toBe('Aarav Sharma');
    expect(s.initials).toBe('AS');
    expect(s.email).toBe('aarav.sharma@duncit.com');
    expect(s.roles).toEqual(['HOST', 'CLUB_ADMIN']);
    expect(s.device).toBe(DEVICE);
    expect(s.flags).toEqual({ gift_cards: true, auto_pods: false });
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
  });

  it('answers role checks against the roles the server granted', () => {
    withUserData({ user: ME });
    const { result } = renderHook(() => useSession());
    expect(result.current.can('HOST')).toBe(true);
    expect(result.current.can('HOST', 'CLUB_ADMIN')).toBe(true);
    expect(result.current.can('HOST', 'SUPER_ADMIN')).toBe(false);
    expect(result.current.canAny('SUPER_ADMIN', 'CLUB_ADMIN')).toBe(true);
    expect(result.current.canAny('SUPER_ADMIN')).toBe(false);
  });

  it('answers hasFlag only for flags the server enabled', () => {
    withUserData({ user: ME });
    const { result } = renderHook(() => useSession());
    expect(result.current.hasFlag('gift_cards')).toBe(true);
    expect(result.current.hasFlag('auto_pods')).toBe(false);
    expect(result.current.hasFlag('never_shipped')).toBe(false);
  });

  it('reports loading while me is in flight with no user yet', () => {
    withUserData({ loading: true });
    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe('loading');
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.roles).toEqual([]);
    expect(result.current.name).toBe('User');
    expect(result.current.initials).toBe('U');
    expect(result.current.email).toBe('');
  });

  it('reports failed when the me query errored and nobody is cached', () => {
    const error = new Error('me query failed');
    withUserData({ error });
    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe('failed');
    expect(result.current.error).toBe(error);
  });

  it('reports anonymous when signed out with no error', () => {
    withUserData({});
    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe('anonymous');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('treats a malformed me without user_id as signed out', () => {
    withUserData({ user: { full_name: 'Ghost Row' } });
    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe('anonymous');
    expect(result.current.user).toBeNull();
  });

  it('passes refetch and logout through and memoizes the snapshot', async () => {
    withUserData({ user: ME });
    const { result, rerender } = renderHook(() => useSession());
    expect(result.current.logout).toBe(logout);
    await expect(result.current.refetch()).resolves.toBe('refetched');
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
