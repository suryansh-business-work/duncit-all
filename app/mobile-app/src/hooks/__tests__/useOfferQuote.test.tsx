import { act, renderHook, waitFor } from '@testing-library/react-native';

import { VenueOfferModel } from '@/generated/graphql/graphql';
import { VenueOfferQuoteDocument } from '@/graphql/venue-offer';
import { useOfferQuote } from '@/hooks/useOfferQuote';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const offer = {
  start_at: '2030-03-05T12:30:00.000Z',
  end_at: '2030-03-05T14:30:00.000Z',
  space_label: '',
  pax: 20,
  pets: false,
  model: VenueOfferModel.PerGuest,
  rate: 300,
};

const priced = (pax: number, payout: number) => ({
  model: 'PER_PAX',
  rate: 300,
  pax,
  hours: 2,
  base: payout,
  rules: [],
  min_spend_top_up: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  gst_pct: 0,
  taxes: 0,
  platform_fee_pct: 5,
  platform_fee: payout * 0.05,
  venue_payout: payout,
  total: payout * 1.05,
  deposit: 0,
});

beforeEach(() => {
  jest.useFakeTimers();
  mockRequest.mockReset();
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('useOfferQuote', () => {
  it('asks nothing until there is a venue and a complete offer', () => {
    const { result } = renderHook(() => useOfferQuote('', offer));
    act(() => jest.advanceTimersByTime(500));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current).toEqual(
      expect.objectContaining({ quote: null, quoteMin: null, loading: false }),
    );
  });

  it("reads the price at the pod's spots and at the venue's minimum guests", async () => {
    mockRequest.mockResolvedValue({
      venueOfferQuote: {
        ok: true,
        message: null,
        quote: priced(20, 6000),
        quote_min: priced(8, 2400),
      },
    });
    const { result } = renderHook(() => useOfferQuote('v1', offer));
    expect(result.current.loading).toBe(true);
    act(() => jest.advanceTimersByTime(300));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockRequest).toHaveBeenCalledWith(
      VenueOfferQuoteDocument,
      { venue_id: 'v1', offer },
      { auth: true },
    );
    expect(result.current.quote?.pax).toBe(20);
    expect(result.current.quoteMin?.pax).toBe(8);
  });

  it('reads the quote itself as the low end when the server prices no minimum', async () => {
    const quote = priced(20, 6000);
    mockRequest.mockResolvedValue({
      venueOfferQuote: { ok: true, message: null, quote, quote_min: null },
    });
    const { result } = renderHook(() => useOfferQuote('v1', offer));
    act(() => jest.advanceTimersByTime(300));
    await waitFor(() => expect(result.current.quote).not.toBeNull());
    expect(result.current.quoteMin).toEqual(quote);
  });

  it('says why an offer cannot be sent, with no price at either end', async () => {
    mockRequest.mockResolvedValue({
      venueOfferQuote: {
        ok: false,
        message: 'The venue is closed then',
        quote: null,
        quote_min: null,
      },
    });
    const { result } = renderHook(() => useOfferQuote('v1', offer));
    act(() => jest.advanceTimersByTime(300));
    await waitFor(() => expect(result.current.message).toBe('The venue is closed then'));
    expect(result.current.quote).toBeNull();
    expect(result.current.quoteMin).toBeNull();
  });

  it('keeps a failed price as the error', async () => {
    const failure = new Error('down');
    mockRequest.mockRejectedValue(failure);
    const { result } = renderHook(() => useOfferQuote('v1', offer));
    act(() => jest.advanceTimersByTime(300));
    await waitFor(() => expect(result.current.error).toBe(failure));
    expect(result.current.loading).toBe(false);
  });

  it('drops an answer that arrives after the offer changed', async () => {
    let answer!: (value: unknown) => void;
    mockRequest.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    mockRequest.mockResolvedValue({
      venueOfferQuote: { ok: true, message: null, quote: priced(30, 9000), quote_min: null },
    });
    const { result, rerender } = renderHook(
      ({ pax }: { pax: number }) => useOfferQuote('v1', { ...offer, pax }),
      { initialProps: { pax: 20 } },
    );
    act(() => jest.advanceTimersByTime(300));
    rerender({ pax: 30 });
    act(() => jest.advanceTimersByTime(300));
    await waitFor(() => expect(result.current.quote?.pax).toBe(30));
    await act(async () => {
      answer({
        venueOfferQuote: { ok: true, message: null, quote: priced(20, 6000), quote_min: null },
      });
    });
    expect(result.current.quote?.pax).toBe(30);
  });

  it('drops a failure that arrives after the offer changed', async () => {
    let fail!: (error: unknown) => void;
    mockRequest.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
    );
    const { result, unmount } = renderHook(() => useOfferQuote('v1', offer));
    act(() => jest.advanceTimersByTime(300));
    unmount();
    await act(async () => {
      fail(new Error('late'));
    });
    expect(result.current.error).toBeNull();
  });
});
