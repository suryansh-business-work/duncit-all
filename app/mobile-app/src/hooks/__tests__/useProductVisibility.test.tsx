import { renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { PRODUCT_VISIBILITY_FLAG, useProductVisibility } from '@/hooks/useProductVisibility';
import { useFeatureFlagsStore } from '@/stores/feature-flags.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => {
  mockRequest.mockReset();
  useFeatureFlagsStore.getState().reset();
});

describe('useProductVisibility', () => {
  it('names the one system flag every product surface hangs off', () => {
    expect(PRODUCT_VISIBILITY_FLAG).toBe('is_product_visible');
  });

  it('is pending, and hidden, until the flag set arrives', async () => {
    mockRequest.mockResolvedValue({
      publicFeatureFlags: [{ key: PRODUCT_VISIBILITY_FLAG, enabled: true }],
    });
    const { result } = renderHook(() => useProductVisibility());
    // Nothing product-shaped may flash on before the server has answered.
    expect(result.current).toEqual({ pending: true, visible: false });
    await waitFor(() => expect(result.current).toEqual({ pending: false, visible: true }));
  });

  it('stays hidden, and no longer pending, when the flag comes back off', async () => {
    mockRequest.mockResolvedValue({
      publicFeatureFlags: [{ key: PRODUCT_VISIBILITY_FLAG, enabled: false }],
    });
    const { result } = renderHook(() => useProductVisibility());
    await waitFor(() => expect(result.current).toEqual({ pending: false, visible: false }));
  });

  it('treats an absent key as off', async () => {
    mockRequest.mockResolvedValue({ publicFeatureFlags: [{ key: 'auto_pods', enabled: true }] });
    const { result } = renderHook(() => useProductVisibility());
    await waitFor(() => expect(result.current).toEqual({ pending: false, visible: false }));
  });
});
