import { act, renderHook, waitFor } from '@testing-library/react-native';

import { ActiveAdsDocument } from '@/graphql/ads';
import { useActiveAds } from '@/hooks/useActiveAds';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

const ad = {
  id: 'a1',
  ad_type: 'IMAGE',
  media_url: 'https://cdn/ad.jpg',
  redirect_url: null,
  ad_title: 'Try Duncit',
  position: 'AUTO',
};

describe('useActiveAds', () => {
  it('loads the live ads for the requested position', async () => {
    mockRequest.mockResolvedValueOnce({ activeAds: [ad] });
    const { result } = renderHook(() => useActiveAds('HOME_BOTTOM'));
    expect(result.current).toEqual({ ads: [], loading: true });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ads).toEqual([ad]);
    expect(mockRequest).toHaveBeenCalledWith(ActiveAdsDocument, { position: 'HOME_BOTTOM' });
  });

  it('resolves to an empty list when the fetch fails (ads never block)', async () => {
    mockRequest.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useActiveAds('SIDEBAR'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ads).toEqual([]);
  });

  it('drops a response that lands after unmount', async () => {
    let resolve!: (v: unknown) => void;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result, unmount } = renderHook(() => useActiveAds('STATUS'));
    unmount();
    await act(async () => {
      resolve({ activeAds: [ad] });
    });
    // The active-guard skips both post-unmount state updates.
    expect(result.current).toEqual({ ads: [], loading: true });
  });
});
