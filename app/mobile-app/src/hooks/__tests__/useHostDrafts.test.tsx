import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useHostDrafts } from '@/hooks/useHostDrafts';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const drafts = [
  { id: 'd1', pod_title: 'One', step: 0, updated_at: '2026-06-12T10:00:00Z' },
  { id: 'd2', pod_title: 'Two', step: 3, updated_at: '2026-06-12T11:00:00Z' },
];

beforeEach(() => mockRequest.mockReset());

describe('useHostDrafts', () => {
  it('loads the host drafts', async () => {
    mockRequest.mockResolvedValueOnce({ myPodDrafts: drafts });
    const { result } = renderHook(() => useHostDrafts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.drafts).toHaveLength(2);
  });

  it('survives a failed load', async () => {
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useHostDrafts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.drafts).toEqual([]);
  });

  it('removes a draft optimistically', async () => {
    mockRequest.mockResolvedValueOnce({ myPodDrafts: drafts });
    const { result } = renderHook(() => useHostDrafts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockRequest.mockResolvedValueOnce({ deletePodDraft: true });
    await act(async () => {
      await result.current.remove('d1');
    });
    expect(result.current.drafts.map((d) => d.id)).toEqual(['d2']);
  });

  it('ignores results that resolve after unmount', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderHook(() => useHostDrafts());
    unmount();
    await act(async () => {
      resolve({ myPodDrafts: drafts });
      await Promise.resolve();
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
