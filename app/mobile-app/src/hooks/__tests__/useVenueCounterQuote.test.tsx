import { act, renderHook, waitFor } from '@testing-library/react-native';

import { VenueCounterQuoteDocument } from '@/graphql/venue-slot-requests';
import { useVenueCounterQuote } from '@/hooks/useVenueCounterQuote';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
// The debounce is the hook's own timer, not what these tests are about.
jest.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: <T,>(value: T) => value }));
const mockRequest = graphqlRequest as jest.Mock;

const result = { ok: true, message: null, quote: { total: 7700, venue_payout: 7000 } };

beforeEach(() => {
  mockRequest.mockReset();
});

describe('useVenueCounterQuote', () => {
  it('asks nothing until there are terms to price', () => {
    const { result: hook } = renderHook(() => useVenueCounterQuote('s1', null, 'failed'));
    expect(hook.current).toEqual({ result: null, error: null, isLoading: false });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("prices the venue's terms for the booking's own window", async () => {
    mockRequest.mockResolvedValue({ venueCounterQuote: result });
    const { result: hook } = renderHook(() =>
      useVenueCounterQuote('s1', { model: 'FLAT', rate: 7000 }, 'failed'),
    );
    await waitFor(() => expect(hook.current.result).toEqual(result));
    expect(hook.current.isLoading).toBe(false);
    expect(mockRequest).toHaveBeenCalledWith(
      VenueCounterQuoteDocument,
      { slot_id: 's1', terms: { model: 'FLAT', rate: 7000 } },
      { auth: true },
    );
  });

  it('says why the price could not be fetched', async () => {
    mockRequest.mockRejectedValue(new Error('down'));
    const { result: hook } = renderHook(() =>
      useVenueCounterQuote('s1', { model: 'FLAT', rate: 7000 }, 'failed'),
    );
    await waitFor(() => expect(hook.current.error).toBe('down'));
    expect(hook.current.result).toBeNull();
  });

  it('drops a late answer for terms already replaced', async () => {
    let resolveFirst: (value: unknown) => void = () => undefined;
    mockRequest
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockRejectedValueOnce(new Error('second failed'));
    const { result: hook, rerender } = renderHook(
      ({ rate }: { rate: number }) => useVenueCounterQuote('s1', { model: 'FLAT', rate }, 'failed'),
      { initialProps: { rate: 7000 } },
    );
    rerender({ rate: 8000 });
    await waitFor(() => expect(hook.current.error).toBe('second failed'));
    await act(async () => resolveFirst({ venueCounterQuote: result }));
    expect(hook.current.result).toBeNull();
  });

  it('goes back to idle when the terms are cleared', async () => {
    mockRequest.mockResolvedValue({ venueCounterQuote: result });
    const { result: hook, rerender } = renderHook(
      ({ terms }: { terms: { model: string; rate: number } | null }) =>
        useVenueCounterQuote('s1', terms, 'failed'),
      {
        initialProps: {
          terms: { model: 'FLAT', rate: 7000 } as { model: string; rate: number } | null,
        },
      },
    );
    await waitFor(() => expect(hook.current.result).toEqual(result));
    rerender({ terms: null });
    expect(hook.current).toEqual({ result: null, error: null, isLoading: false });
  });
});
