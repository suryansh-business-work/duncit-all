import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useProductOrders } from '@/hooks/useProductOrders';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

describe('useProductOrders', () => {
  it('fetches the pod product orders', async () => {
    mockRequest.mockResolvedValueOnce({ myProductOrdersForPod: [{ id: 'o1' }] });
    const { result } = renderHook(() => useProductOrders('p1'));
    await waitFor(() => expect(result.current.orders).toHaveLength(1));
    expect(result.current.isLoading).toBe(false);
  });

  it('captures an error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useProductOrders('p1'));
    await waitFor(() => expect(result.current.error).toBeDefined());
  });

  it('skips fetching without a pod id', () => {
    const { result } = renderHook(() => useProductOrders(undefined));
    expect(result.current.orders).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('ignores a response that resolves after unmount', async () => {
    let resolve!: (v: unknown) => void;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderHook(() => useProductOrders('p1'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    unmount();
    await act(async () => {
      resolve({ myProductOrdersForPod: [{ id: 'late' }] });
    });
  });

  it('ignores a rejection that lands after unmount', async () => {
    let reject!: (e: unknown) => void;
    mockRequest.mockReturnValueOnce(
      new Promise((_res, rej) => {
        reject = rej;
      }),
    );
    const { unmount } = renderHook(() => useProductOrders('p1'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    unmount();
    await act(async () => {
      reject(new Error('late'));
    });
  });
});
