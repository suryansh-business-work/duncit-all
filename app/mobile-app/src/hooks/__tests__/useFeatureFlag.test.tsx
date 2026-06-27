import { renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useFeatureFlagsStore } from '@/stores/feature-flags.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => {
  mockRequest.mockReset();
  useFeatureFlagsStore.getState().reset();
});

describe('useFeatureFlag', () => {
  it('returns the default while loading, then the server value once flags arrive', async () => {
    mockRequest.mockResolvedValue({
      publicFeatureFlags: [{ key: 'is_product_visible', enabled: true }],
    });
    const { result } = renderHook(() => useFeatureFlag('is_product_visible'));
    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('falls back to the default when the flag is absent', async () => {
    mockRequest.mockResolvedValue({ publicFeatureFlags: [{ key: 'other', enabled: true }] });
    const { result } = renderHook(() => useFeatureFlag('is_product_visible', true));
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(result.current).toBe(true);
  });

  it('honours a disabled flag from the server', async () => {
    mockRequest.mockResolvedValue({
      publicFeatureFlags: [{ key: 'is_product_visible', enabled: false }],
    });
    const { result } = renderHook(() => useFeatureFlag('is_product_visible', true));
    await waitFor(() => expect(result.current).toBe(false));
  });
});
