import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useVenueSlots } from '@/hooks/useVenueSlots';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const slot = {
  id: 's1',
  start_at: '2030-01-01T10:00:00.000Z',
  end_at: '2030-01-01T12:00:00.000Z',
  price: 400,
  status: 'AVAILABLE',
};

beforeEach(() => mockRequest.mockReset());

describe('useVenueSlots', () => {
  it('loads slots for a venue and clears them when the venue is unset', async () => {
    mockRequest.mockResolvedValueOnce({ venueAvailableSlots: [slot] });
    const { result, rerender } = renderHook((id: string) => useVenueSlots(id), {
      initialProps: 'v1',
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.slots).toEqual([slot]);

    rerender('');
    expect(result.current.slots).toEqual([]);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('asks for the slot a Pod Request holds and refetches when the request changes', async () => {
    mockRequest.mockResolvedValue({ venueAvailableSlots: [slot] });
    const { result, rerender } = renderHook(
      ({ id, requestId }: { id: string; requestId: string }) => useVenueSlots(id, requestId),
      { initialProps: { id: 'v1', requestId: '' } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // No request → the argument is sent as null, not an empty id.
    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.anything(),
      { venue_id: 'v1', partner_request_id: null },
      { auth: true },
    );

    rerender({ id: 'v1', requestId: 'req1' });
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.anything(),
      { venue_id: 'v1', partner_request_id: 'req1' },
      { auth: true },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('falls back to an empty list when the request fails', async () => {
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useVenueSlots('v1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.slots).toEqual([]);
  });

  it('treats a missing list as empty and ignores results after unmount', async () => {
    mockRequest.mockResolvedValueOnce({ venueAvailableSlots: null });
    const { result } = renderHook(() => useVenueSlots('v1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.slots).toEqual([]);

    let resolve: (value: unknown) => void = () => undefined;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderHook(() => useVenueSlots('v2'));
    unmount();
    await act(async () => {
      resolve({ venueAvailableSlots: [slot] });
      await Promise.resolve();
    });
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('ignores failures that land after unmount', async () => {
    let reject: (reason?: unknown) => void = () => undefined;
    mockRequest.mockReturnValueOnce(
      new Promise((_r, rej) => {
        reject = rej;
      }),
    );
    const { unmount } = renderHook(() => useVenueSlots('v1'));
    unmount();
    await act(async () => {
      reject(new Error('late boom'));
      await Promise.resolve();
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
