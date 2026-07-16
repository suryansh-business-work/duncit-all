import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
  useQuery: useQueryMock,
}));

const { useFeatureFlag } = await import('../src/useFeatureFlag');

type Flag = { key: string; enabled: boolean };
const result = (over: { data?: { publicFeatureFlags?: Flag[] }; loading: boolean }) => {
  useQueryMock.mockReturnValue(over);
};

beforeEach(() => {
  useQueryMock.mockReset();
});

describe('useFeatureFlag', () => {
  it('returns the default value while loading with no cached data', () => {
    result({ data: undefined, loading: true });
    expect(useFeatureFlag('beta')).toBe(false);
    expect(useFeatureFlag('beta', true)).toBe(true);
  });

  it('reads a cached flag even while a refetch is loading', () => {
    result({ data: { publicFeatureFlags: [{ key: 'beta', enabled: true }] }, loading: true });
    expect(useFeatureFlag('beta')).toBe(true);
  });

  it('returns true only when the matching flag is enabled', () => {
    result({ data: { publicFeatureFlags: [{ key: 'beta', enabled: true }] }, loading: false });
    expect(useFeatureFlag('beta')).toBe(true);
  });

  it('returns false when the matching flag is disabled', () => {
    result({ data: { publicFeatureFlags: [{ key: 'beta', enabled: false }] }, loading: false });
    expect(useFeatureFlag('beta')).toBe(false);
  });

  it('returns the default value when the flag is missing', () => {
    result({ data: { publicFeatureFlags: [{ key: 'other', enabled: true }] }, loading: false });
    expect(useFeatureFlag('beta')).toBe(false);
    expect(useFeatureFlag('beta', true)).toBe(true);
  });

  it('treats an absent publicFeatureFlags list as empty', () => {
    result({ data: {}, loading: false });
    expect(useFeatureFlag('beta')).toBe(false);
  });

  it('treats absent data (not loading) as an empty flag set', () => {
    result({ data: undefined, loading: false });
    expect(useFeatureFlag('beta')).toBe(false);
  });
});
