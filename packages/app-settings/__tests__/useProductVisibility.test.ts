import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: useQueryMock,
}));

const { PRODUCT_VISIBILITY_FLAG, useProductVisibility } = await import(
  '../src/useProductVisibility'
);

type Flag = { key: string; enabled: boolean };
const answer = (over: { data?: { publicFeatureFlags?: Flag[] }; loading: boolean }) => {
  useQueryMock.mockReturnValue(over);
};

beforeEach(() => {
  useQueryMock.mockReset();
});

describe('useProductVisibility', () => {
  it('names the one system flag every product surface hangs off', () => {
    expect(PRODUCT_VISIBILITY_FLAG).toBe('is_product_visible');
  });

  it('is pending, and hidden, while the flag set is still in flight', () => {
    answer({ data: undefined, loading: true });
    expect(useProductVisibility()).toEqual({ pending: true, visible: false });
  });

  it('shows products only once the server says the flag is on', () => {
    answer({
      data: { publicFeatureFlags: [{ key: PRODUCT_VISIBILITY_FLAG, enabled: true }] },
      loading: false,
    });
    expect(useProductVisibility()).toEqual({ pending: false, visible: true });
  });

  it('hides products when the flag is off', () => {
    answer({
      data: { publicFeatureFlags: [{ key: PRODUCT_VISIBILITY_FLAG, enabled: false }] },
      loading: false,
    });
    expect(useProductVisibility()).toEqual({ pending: false, visible: false });
  });

  it('hides products when the key is absent from the server set', () => {
    answer({ data: { publicFeatureFlags: [{ key: 'auto_pods', enabled: true }] }, loading: false });
    expect(useProductVisibility()).toEqual({ pending: false, visible: false });
  });

  it('stops pending as soon as cached data exists, even during a refetch', () => {
    answer({
      data: { publicFeatureFlags: [{ key: PRODUCT_VISIBILITY_FLAG, enabled: true }] },
      loading: true,
    });
    expect(useProductVisibility()).toEqual({ pending: false, visible: true });
  });
});
