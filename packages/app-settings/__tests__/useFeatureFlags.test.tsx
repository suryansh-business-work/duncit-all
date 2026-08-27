// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
  useQuery: useQueryMock,
}));

// Import AFTER the mock is registered.
const { useFeatureFlags } = await import('../src/useFeatureFlag');

type Flag = { key: string; enabled: boolean | null };

const withFlags = (data?: { publicFeatureFlags?: Flag[] }) => {
  useQueryMock.mockReturnValue({ data, loading: false });
};

beforeEach(() => {
  useQueryMock.mockReset();
});

describe('useFeatureFlags', () => {
  it('maps every server flag to a strict boolean', () => {
    withFlags({
      publicFeatureFlags: [
        { key: 'gift_cards', enabled: true },
        { key: 'auto_pods', enabled: false },
        // Legacy rows can carry null; only an explicit true may enable.
        { key: 'leaderboard', enabled: null },
      ],
    });
    const { result } = renderHook(() => useFeatureFlags());
    expect(result.current).toEqual({ gift_cards: true, auto_pods: false, leaderboard: false });
  });

  it('returns an empty map while the query has no data yet', () => {
    withFlags(undefined);
    const { result } = renderHook(() => useFeatureFlags());
    expect(result.current).toEqual({});
  });

  it('treats an absent publicFeatureFlags list as empty', () => {
    withFlags({});
    const { result } = renderHook(() => useFeatureFlags());
    expect(result.current).toEqual({});
  });

  it('keeps the same map reference across rerenders with unchanged data', () => {
    const data = { publicFeatureFlags: [{ key: 'gift_cards', enabled: true }] };
    useQueryMock.mockReturnValue({ data, loading: false });
    const { result, rerender } = renderHook(() => useFeatureFlags());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
