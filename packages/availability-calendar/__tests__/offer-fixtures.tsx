import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import type { VenueChatOfferMove } from '@duncit/utils';
import type { PodOffer } from '../src/offers/host/queries';
import type { BookingOffer, BookingRequestRow, OfferCounter } from '../src/offers/queries';
import { breakdownResult, makeBreakdown } from './pricing-fixtures';

/** The waits a mocked round trip (and the quote's 400 ms debounce) may take on a slow runner. */
export const SETTLED = { timeout: 3000 };

/** 20 guests × ₹300: the venue receives ₹6,000, the pod pays ₹6,600. */
export const quote = breakdownResult(makeBreakdown({ model: 'PER_PAX', rate: 300, venue_payout: 6000, platform_fee: 600, total: 6600 }));
/** The same terms at the venue's minimum of 8 guests. */
export const quoteMin = breakdownResult(
  makeBreakdown({ model: 'PER_PAX', rate: 300, pax: 8, base: 2400, venue_price: 2400, venue_payout: 2400, platform_fee: 240, total: 2640 }),
);
/** A flat ₹7,000 — the same money at any guests. */
export const flatQuote = breakdownResult(
  makeBreakdown({ model: 'FLAT', rate: 7000, base: 7000, venue_price: 7000, venue_payout: 7000, platform_fee: 700, total: 7700 }),
);

/** Photos a side attached to its terms, as ImageKit serves them. */
export const PHOTO_A = 'https://ik.imagekit.io/duncit/chat/setup.jpg';
export const PHOTO_B = 'https://ik.imagekit.io/duncit/chat/menu.jpg';

export function makeCounter(over: Partial<OfferCounter> = {}): OfferCounter {
  return {
    __typename: 'VenueOfferCounter',
    model: 'FLAT',
    rate: 7000,
    min_guests: 0,
    offerings: [],
    note: '',
    images: [],
    at: null,
    quote: flatQuote,
    quote_min: flatQuote,
    ...over,
  } as OfferCounter;
}

/** The host's per-guest offer for 20 guests, at least 8 paid for, waiting on the venue. */
export function makeOffer(over: Partial<BookingOffer> = {}): BookingOffer {
  return {
    __typename: 'VenueBookingOffer',
    slot_id: 'slot-1',
    status: 'SENT',
    round: 1,
    awaiting: 'VENUE',
    model: 'PER_GUEST',
    rate: 300,
    pax: 20,
    min_guests: 8,
    offerings: ['10 chairs', 'A projector'],
    note: 'We will bring our own speakers.',
    images: [],
    pets: false,
    space_label: '',
    expires_at: '2026-12-02T06:30:00.000Z',
    // Pod Settings' share: three counters each side, none made yet.
    counters_per_side: 3,
    host_counters_used: 0,
    venue_counters_used: 0,
    // A priced offer on a paid pod: countered freely, no free justification.
    free_pod: false,
    free_justification: null,
    quote,
    quote_min: quoteMin,
    counter: null,
    history: [
      {
        __typename: 'VenueOfferHistoryEntry',
        by: 'HOST',
        action: 'OFFER',
        model: 'PER_GUEST',
        rate: 300,
        min_guests: 8,
        total: 6600,
        note: '',
        at: '2026-12-01T06:30:00.000Z',
      },
    ],
    ...over,
  } as BookingOffer;
}

/** A pod's live offer as `podVenueOffer` answers it — every field either selection asks for. */
export function makePodOffer(over: Partial<PodOffer> = {}): PodOffer {
  const { history: _history, ...terms } = makeOffer();
  return {
    ...terms,
    pod_id: 'pod-1',
    venue_id: 'venue-1',
    start_at: '2026-12-05T12:30:00.000Z',
    end_at: '2026-12-05T14:30:00.000Z',
    ...over,
  } as PodOffer;
}

/** Nothing to pay: a free venue's quote at any guests. */
export const freeQuote = breakdownResult(
  makeBreakdown({ model: 'FLAT', rate: 0, base: 0, venue_price: 0, venue_payout: 0, platform_fee: 0, total: 0 }),
);

/** The host asked the venue for the window free, for a launch promotion — no counters either way. */
export const freeVenueOffer = (over: Partial<BookingOffer> = {}): BookingOffer =>
  makeOffer({
    model: 'FREE',
    rate: 0,
    min_guests: 0,
    counters_per_side: 0,
    quote: freeQuote,
    quote_min: freeQuote,
    free_justification: { __typename: 'FreeJustification', reason: 'PROMOTIONAL', details: 'Launch week', accepted_at: '2026-12-01T06:30:00.000Z' },
    history: [
      { __typename: 'VenueOfferHistoryEntry', by: 'HOST', action: 'OFFER', model: 'FREE', rate: 0, min_guests: 0, total: 0, note: '', at: '2026-12-01T06:30:00.000Z' },
    ],
    ...over,
  } as Partial<BookingOffer>);

/** The venue countered the host's offer with a flat ₹7,000 (its first counter); the host's move. */
export const counteredPodOffer = (over: Partial<PodOffer> = {}) =>
  makePodOffer({ status: 'COUNTERED', awaiting: 'HOST', round: 2, venue_counters_used: 1, counter: makeCounter({ note: 'Weekend rate' }), ...over });

export function makeRequest(over: Partial<BookingRequestRow> = {}): BookingRequestRow {
  return {
    __typename: 'VenueSlotRequest',
    slot_id: 'slot-1',
    venue_id: 'venue-1',
    venue_name: 'Skyline Banquets',
    start_at: '2026-12-05T12:30:00.000Z',
    end_at: '2026-12-05T14:30:00.000Z',
    whole_day: false,
    price: 4500,
    requested_at: '2026-12-01T06:30:00.000Z',
    pod_id: 'pod-1',
    pod_title: 'Pottery night',
    host_name: 'Asha',
    host_email: 'asha@example.com',
    host_phone: '+919800000000',
    pod_is_free: false,
    offer: makeOffer(),
    ...over,
  } as BookingRequestRow;
}

/** One move of the offer as a chat line carries it: the host's offer, waiting on the venue. */
export function makeMove(over: Partial<VenueChatOfferMove> = {}): VenueChatOfferMove {
  return {
    slot_id: 'slot-1',
    round: 1,
    event: 'OFFER',
    by: 'HOST',
    model: 'PER_GUEST',
    rate: 300,
    min_guests: 8,
    max_guests: 20,
    offerings: ['10 chairs'],
    note: 'We will bring our own speakers.',
    start_at: '2026-12-05T12:30:00.000Z',
    end_at: '2026-12-05T14:30:00.000Z',
    space_label: 'Terrace',
    pets: false,
    venue_receives_min: 2400,
    venue_receives_max: 6000,
    total_min: 2640,
    total_max: 6600,
    expires_at: '2026-12-02T06:30:00.000Z',
    reason: '',
    ...over,
  };
}

export type Vars = Record<string, unknown>;

/** A mock answering any variables, recording each set it was asked with. */
export function mockOf(query: MockedResponse['request']['query'], answer: (v: Vars) => object, seen: Vars[] = []): MockedResponse {
  return {
    request: { query, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: (variables: Vars) => {
      seen.push(variables);
      return answer(variables) as never;
    },
  };
}

export const failWith = (message: string) => () => ({ errors: [new GraphQLError(message)] });

/** The server's refusal when the other side moved first. */
export const offerChanged = () => () => ({
  errors: [new GraphQLError('The offer changed', { extensions: { code: 'CONFLICT', reason: 'OFFER_CHANGED' } })],
});

export const withApollo = (mocks: MockedResponse[], ui: ReactNode) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      {ui}
    </MockedProvider>,
  );
