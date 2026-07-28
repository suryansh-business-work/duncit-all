import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useBookingDetail } from '@/hooks/useBookingDetail';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

describe('useBookingDetail', () => {
  it('resolves the booking behind the deep link', async () => {
    mockRequest.mockResolvedValueOnce({ bookingDetail: { id: 'bk-1', club_slug: 'jam' } });
    const { result } = renderHook(() => useBookingDetail('bk-1'));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.booking).toEqual({ id: 'bk-1', club_slug: 'jam' }));
    expect(result.current.isLoading).toBe(false);
    expect(mockRequest.mock.calls[0][1]).toEqual({ booking_id: 'bk-1' });
    expect(mockRequest.mock.calls[0][2]).toEqual({ auth: true });
  });

  it('captures the server ownership rejection', async () => {
    mockRequest.mockRejectedValueOnce(new Error('You are not authorized to view this booking.'));
    const { result } = renderHook(() => useBookingDetail('bk-1'));
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.booking).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('ignores a response that resolves after unmount', async () => {
    let resolve!: (v: unknown) => void;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderHook(() => useBookingDetail('bk-1'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    unmount();
    await act(async () => {
      resolve({ bookingDetail: { id: 'late' } });
    });
  });

  it('ignores a rejection that lands after unmount', async () => {
    let reject!: (e: unknown) => void;
    mockRequest.mockReturnValueOnce(
      new Promise((_res, rej) => {
        reject = rej;
      }),
    );
    const { unmount } = renderHook(() => useBookingDetail('bk-1'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    unmount();
    await act(async () => {
      reject(new Error('late'));
    });
  });
});
