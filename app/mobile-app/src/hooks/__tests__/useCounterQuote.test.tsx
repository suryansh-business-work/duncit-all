import { act, renderHook, waitFor } from '@testing-library/react-native';

import { VenueOfferModel, type VenueOfferTermsInput } from '@/generated/graphql/graphql';
import { HostCounterQuoteDocument } from '@/graphql/venue-offer';
import { VenueCounterQuoteDocument } from '@/graphql/venue-slot-requests';
import { useCounterQuote, type CounterQuoteTarget } from '@/hooks/useCounterQuote';
import { graphqlRequest } from '@/services/graphql.client';
import { offerQuote } from '@/utils/venue-offer-fixture';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
// The debounce is the hook's own timer, not what these tests are about.
jest.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: <T,>(value: T) => value }));
const mockRequest = graphqlRequest as jest.Mock;

const VENUE: CounterQuoteTarget = { side: 'VENUE', slotId: 's1' };
const HOST: CounterQuoteTarget = { side: 'HOST', podId: 'p1' };
const FLAT: VenueOfferTermsInput = { model: VenueOfferModel.Flat, rate: 7000 };
const priced = {
  ok: true,
  message: null,
  quote: offerQuote(7000, 7700),
  quote_min: offerQuote(7000, 7700),
};

beforeEach(() => mockRequest.mockReset());

describe('useCounterQuote', () => {
  it('asks nothing until there are terms to price', () => {
    const { result } = renderHook(() => useCounterQuote(VENUE, null, 'failed'));
    expect(result.current).toEqual({ result: null, error: null, isLoading: false });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("prices the venue's counter for its booking", async () => {
    mockRequest.mockResolvedValue({ venueCounterQuote: priced });
    const { result } = renderHook(() => useCounterQuote(VENUE, FLAT, 'failed'));
    await waitFor(() => expect(result.current.result).toEqual(priced));
    expect(result.current.isLoading).toBe(false);
    expect(mockRequest).toHaveBeenCalledWith(
      VenueCounterQuoteDocument,
      { slot_id: 's1', terms: FLAT },
      { auth: true },
    );
  });

  it("prices the host's counter-back for their pod", async () => {
    mockRequest.mockResolvedValue({ hostCounterQuote: priced });
    const { result } = renderHook(() => useCounterQuote(HOST, FLAT, 'failed'));
    await waitFor(() => expect(result.current.result).toEqual(priced));
    expect(mockRequest).toHaveBeenCalledWith(
      HostCounterQuoteDocument,
      { pod_id: 'p1', terms: FLAT },
      { auth: true },
    );
  });

  it('says why the price could not be fetched, or the fallback for a bare failure', async () => {
    mockRequest.mockRejectedValueOnce(new Error('down'));
    const { result, rerender } = renderHook(
      ({ rate }: { rate: number }) => useCounterQuote(VENUE, { ...FLAT, rate }, 'failed'),
      { initialProps: { rate: 7000 } },
    );
    await waitFor(() => expect(result.current.error).toBe('down'));
    expect(result.current.result).toBeNull();

    mockRequest.mockRejectedValueOnce(new Error(''));
    rerender({ rate: 7500 });
    await waitFor(() => expect(result.current.error).toBe('failed'));
  });

  it('drops a late answer for terms already replaced', async () => {
    let resolveFirst: (value: unknown) => void = () => undefined;
    let rejectFirst: (error: unknown) => void = () => undefined;
    mockRequest
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValueOnce({ venueCounterQuote: priced });
    const { result, rerender } = renderHook(
      ({ rate }: { rate: number }) => useCounterQuote(VENUE, { ...FLAT, rate }, 'failed'),
      { initialProps: { rate: 7000 } },
    );
    rerender({ rate: 8000 });
    rerender({ rate: 9000 });
    await waitFor(() => expect(result.current.result).toEqual(priced));
    await act(async () => {
      resolveFirst({ venueCounterQuote: { ...priced, ok: false } });
      rejectFirst(new Error('late'));
    });
    expect(result.current).toEqual({ result: priced, error: null, isLoading: false });
  });

  it('goes back to idle when the terms are cleared', async () => {
    mockRequest.mockResolvedValue({ venueCounterQuote: priced });
    const initialProps: { terms: VenueOfferTermsInput | null } = { terms: FLAT };
    const { result, rerender } = renderHook(
      ({ terms }: { terms: VenueOfferTermsInput | null }) =>
        useCounterQuote(VENUE, terms, 'failed'),
      { initialProps },
    );
    await waitFor(() => expect(result.current.result).toEqual(priced));
    rerender({ terms: null });
    expect(result.current).toEqual({ result: null, error: null, isLoading: false });
  });
});
