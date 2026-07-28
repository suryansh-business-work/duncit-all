import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useSuggestedTicketPrices } from '@/hooks/useSuggestedTicketPrices';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const ladder = {
  suggestedTicketPrices: [
    { price: 99, host_receives: 40.12 },
    { price: 199, host_receives: 90.5 },
  ],
};

beforeEach(() => mockRequest.mockReset());

describe('useSuggestedTicketPrices', () => {
  it('never queries while the modal is closed', () => {
    const { result } = renderHook(() => useSuggestedTicketPrices(false, 30, 'v1', 400));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.prices).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('skips a pod that can only seat the host (nothing is billable)', () => {
    renderHook(() => useSuggestedTicketPrices(true, 1, null, null));
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('loads the ladder with the picked venue args once open', async () => {
    mockRequest.mockResolvedValue(ladder);
    const { result } = renderHook(() => useSuggestedTicketPrices(true, 30, 'v1', 400));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { no_of_spots: 30, venue_id: 'v1', venue_amount: 400 },
      { auth: true },
    );
    expect(result.current.prices).toEqual(ladder.suggestedTicketPrices);
    expect(result.current.error).toBe(false);
  });

  it('flags a failed load', async () => {
    mockRequest.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useSuggestedTicketPrices(true, 30, null, null));
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.prices).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('ignores a resolution that lands after unmount', async () => {
    let resolve!: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result, unmount } = renderHook(() => useSuggestedTicketPrices(true, 30, null, null));
    unmount();
    await act(async () => {
      resolve(ladder);
    });
    expect(result.current.prices).toEqual([]);
  });
});
