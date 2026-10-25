import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { gql } from '@apollo/client';
import { describe, expect, it, vi } from 'vitest';
import { POD_VENUE_OFFER_TERMS } from '@duncit/availability-calendar';
import { ACCEPT_VENUE_COUNTER_OFFER_SDL } from '@duncit/utils';
import VenueOfferCard from '../VenueOfferCard';

const breakdown = (venue_payout: number, total: number, pax: number) => ({
  __typename: 'VenuePriceBreakdown',
  model: 'PER_PAX',
  rate: 300,
  pax,
  hours: 2,
  date: '2026-12-05',
  base: venue_payout,
  rules: [],
  rules_total: 0,
  min_spend_top_up: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  venue_price: venue_payout,
  gst_pct: 0,
  taxes: 0,
  venue_payout,
  platform_fee_pct: 10,
  platform_fee: total - venue_payout,
  total,
  deposit: 0,
});

/** The host's per-guest offer for 20 guests, at least 8 paid for, waiting on the venue. */
const offer = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueBookingOffer',
  slot_id: 'slot-1',
  venue_id: 'venue-1',
  pod_id: 'pod-1',
  start_at: '2026-12-05T12:30:00.000Z',
  end_at: '2026-12-05T14:30:00.000Z',
  status: 'SENT',
  round: 1,
  awaiting: 'VENUE',
  model: 'PER_GUEST',
  rate: 300,
  pax: 20,
  min_guests: 8,
  offerings: ['10 chairs', 'A projector'],
  note: 'We will bring our own speakers.',
  pets: false,
  space_label: '',
  expires_at: '2026-12-02T06:30:00.000Z',
  quote: breakdown(6000, 6600, 20),
  quote_min: breakdown(2400, 2640, 8),
  counter: null,
  ...over,
});

const countered = offer({
  status: 'COUNTERED',
  awaiting: 'HOST',
  round: 2,
  counter: {
    __typename: 'VenueOfferCounter',
    model: 'FLAT',
    rate: 7000,
    min_guests: 0,
    offerings: ['A stage'],
    note: 'Weekend rate',
    at: null,
    quote: breakdown(7000, 7700, 20),
    quote_min: breakdown(7000, 7700, 20),
  },
});

const offerMock = (podVenueOffer: object | null, seen: unknown[] = []): MockedResponse => ({
  request: { query: POD_VENUE_OFFER_TERMS, variables: { pod_id: 'pod-1' } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: () => {
    seen.push(podVenueOffer);
    return { data: { podVenueOffer } };
  },
});

const renderCard = (mocks: MockedResponse[], podIsFree = false, onAnswered = vi.fn().mockResolvedValue(undefined)) => {
  const view = render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <VenueOfferCard podId="pod-1" podTitle="Pottery night" venueName="Skyline Banquets" podIsFree={podIsFree} onAnswered={onAnswered} />
    </MockedProvider>,
  );
  return { ...view, onAnswered };
};

describe('VenueOfferCard (pod pending)', () => {
  it('draws nothing for a pod without a live offer', async () => {
    const seen: unknown[] = [];
    const { container } = renderCard([offerMock(null, seen)]);
    await waitFor(() => expect(seen).toHaveLength(1));
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the host's own offer: what it costs the pod at either end, what it asks, and until when the venue may answer", async () => {
    renderCard([offerMock(offer())]);
    const card = within(await screen.findByTestId('venue-offer-card'));
    expect(card.getByRole('heading', { name: 'Your offer to the venue' })).toBeInTheDocument();
    expect(card.getByText('Your offer')).toBeInTheDocument();
    expect(card.getByTestId('offer-status')).toHaveTextContent('Waiting for the venue to answer');
    expect(card.getByText(/^Costs the pod/)).toHaveTextContent('₹2,640 – ₹6,600');
    expect(card.getByText(/^The venue receives/)).toHaveTextContent('₹2,400 – ₹6,000');
    expect(card.getByRole('list', { name: 'What the venue provides' })).toHaveTextContent('A projector');
    expect(card.getByText('We will bring our own speakers.')).toBeInTheDocument();
    expect(card.getByTestId('offer-answer-by')).toHaveTextContent(/^Answer by/);
    expect(card.queryByRole('button')).not.toBeInTheDocument();
  });

  it("accepts the venue's counter for the round read, then re-reads the offer and the page", async () => {
    const seen: unknown[] = [];
    const sent: unknown[] = [];
    const accept: MockedResponse = {
      request: { query: gql(ACCEPT_VENUE_COUNTER_OFFER_SDL), variables: () => true },
      result: (variables: unknown) => {
        sent.push(variables);
        return { data: { acceptVenueCounterOffer: { ...countered, status: 'ACCEPTED', awaiting: null } } };
      },
    };
    const { onAnswered } = renderCard([offerMock(countered, seen), accept]);
    const card = within(await screen.findByTestId('venue-offer-card'));
    expect(card.getByText("The venue's counter")).toBeInTheDocument();
    expect(card.getByText('Note from the venue')).toBeInTheDocument();
    fireEvent.click(card.getByTestId('host-offer-accept'));
    fireEvent.click(within(screen.getByRole('dialog')).getByTestId('answer-offer-submit'));
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1));
    expect(sent).toEqual([{ pod_id: 'pod-1', round: 2 }]);
    await waitFor(() => expect(seen.length).toBeGreaterThanOrEqual(2));
  });

  it('quotes no money on a free pod', async () => {
    renderCard([offerMock(offer())], true);
    expect(await screen.findByText(/Free pod: you settle the venue's charges/)).toBeInTheDocument();
    expect(screen.queryByText(/^Costs the pod/)).not.toBeInTheDocument();
  });
});
