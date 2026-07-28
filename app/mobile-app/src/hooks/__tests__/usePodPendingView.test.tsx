import { act, renderHook, waitFor } from '@testing-library/react-native';

import { usePodPendingView } from '@/hooks/usePodPendingView';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

describe('usePodPendingView', () => {
  it('fetches the pending view for the pod', async () => {
    mockRequest.mockResolvedValueOnce({ hostPodPendingView: { category_name: 'Music' } });
    const { result } = renderHook(() => usePodPendingView('p1'));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.view).toEqual({ category_name: 'Music' }));
    expect(result.current.isLoading).toBe(false);
    expect(mockRequest.mock.calls[0][1]).toEqual({ pod_doc_id: 'p1' });
  });

  it('captures an error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => usePodPendingView('p1'));
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.isLoading).toBe(false);
  });

  it('ignores a response that resolves after unmount', async () => {
    let resolve!: (v: unknown) => void;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderHook(() => usePodPendingView('p1'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    unmount();
    await act(async () => {
      resolve({ hostPodPendingView: { category_name: 'late' } });
    });
  });

  it('ignores a rejection that lands after unmount', async () => {
    let reject!: (e: unknown) => void;
    mockRequest.mockReturnValueOnce(
      new Promise((_res, rej) => {
        reject = rej;
      }),
    );
    const { unmount } = renderHook(() => usePodPendingView('p1'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    unmount();
    await act(async () => {
      reject(new Error('late'));
    });
  });
});
