import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import OfferChatCard from '../src/offers/chat/OfferChatCard';
import VenueOfferPinnedBar from '../src/offers/chat/VenueOfferPinnedBar';
import HostOfferActions from '../src/offers/host/HostOfferActions';
import type { PodOffer } from '../src/offers/host/queries';
import OfferDecisionActions from '../src/offers/OfferDecisionActions';
import OfferRequestCard from '../src/offers/OfferRequestCard';
import OfferTermsPanel from '../src/offers/OfferTermsPanel';
import { COUNTER_VENUE_OFFER, VENUE_COUNTER_QUOTE, type OfferFreeJustification } from '../src/offers/queries';
import {
  SETTLED,
  counteredPodOffer,
  flatQuote,
  freeVenueOffer,
  makeMove,
  makeOffer,
  makePodOffer,
  makeRequest,
  mockOf,
  withApollo,
} from './offer-fixtures';

vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<object>()), notifySuccess: vi.fn(), notify: vi.fn() }));
// The counter form attaches photos through the picker; the real one needs a router and ImageKit.
vi.mock('@duncit/media-picker', async () => ({ MediaPickerDialog: (await import('./media-picker-stub')).MediaPickerStub }));

const NO_COUNTERS = 'Free booking — it can only be accepted or declined, never countered.';
const subject = { pod_id: 'pod-1', pod_title: 'Pottery night', venue_name: 'Skyline Banquets' };
const justification = (over: Partial<OfferFreeJustification> = {}) =>
  ({ reason: 'PROMOTIONAL', details: 'Launch week', accepted_at: '2026-12-01T06:30:00.000Z', ...over }) as OfferFreeJustification;

/** The pod's live offer when its host asked the venue for the window free. */
const liveFree = (over: Partial<PodOffer> = {}) => {
  const { history: _history, ...terms } = freeVenueOffer();
  return makePodOffer({ ...terms, ...over });
};

/** The host's free-venue offer as its chat line carries it. */
const freeMove = (over: Parameters<typeof makeMove>[0] = {}) =>
  makeMove({ model: 'FREE', rate: 0, min_guests: 20, venue_receives_min: 0, venue_receives_max: 0, total_min: 0, total_max: 0, ...over });

describe('a free venue, as the venue answers it', () => {
  it("reads as a free venue with the host's reason, quotes no money, and is only accepted or rejected", () => {
    withApollo([], <OfferRequestCard request={makeRequest({ offer: freeVenueOffer() })} onDone={vi.fn()} />);
    const terms = within(screen.getByTestId('offer-terms-slot-1'));
    expect(terms.getByText('Free venue')).toBeInTheDocument();
    expect(terms.queryByTestId('offer-money')).not.toBeInTheDocument();
    expect(terms.getByTestId('offer-free-reason')).toHaveTextContent('Requested free — Promotional offer: Launch week');
    expect(screen.getByTestId('offer-history')).toHaveTextContent('The host offered Free venue');
    expect(screen.queryByTestId('offer-counter-slot-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('counter-allowance-venue')).toHaveTextContent(NO_COUNTERS);

    fireEvent.click(screen.getByTestId('offer-accept-slot-1'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/goes live at Skyline Banquets/)).toHaveTextContent('“Pottery night” goes live at Skyline Banquets on');
    expect(dialog).not.toHaveTextContent('you receive');
  });

  it('names the reason alone when the host gave no details', () => {
    withApollo([], <OfferTermsPanel offer={freeVenueOffer({ free_justification: justification({ reason: 'INITIATIVE', details: '' }) })} podIsFree={false} />);
    expect(screen.getByTestId('offer-free-reason').textContent).toBe('Requested free — Special initiative');
  });

  it('names no reason this client does not know, nor one a priced offer never has', () => {
    const unknown = justification({ reason: 'SPONSORED' as OfferFreeJustification['reason'] });
    withApollo([], <OfferTermsPanel offer={freeVenueOffer({ free_justification: unknown })} podIsFree={false} />);
    expect(screen.queryByTestId('offer-free-reason')).not.toBeInTheDocument();
    expect(screen.getByText('Free venue')).toBeInTheDocument();
  });
});

describe('a free pod', () => {
  it('lets the venue only accept or reject a priced offer on it, and says why there is no counter', () => {
    const offer = makeOffer({ free_pod: true, counters_per_side: 0 });
    withApollo([], <OfferDecisionActions request={makeRequest({ offer, pod_is_free: true })} offer={offer} onDone={vi.fn()} />);
    expect(screen.queryByTestId('offer-counter-slot-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('offer-reject-slot-1')).toBeInTheDocument();
    expect(screen.getByTestId('counter-allowance-venue')).toHaveTextContent(NO_COUNTERS);
  });

  it("names no amount in the host's accept, read off the offer itself", () => {
    withApollo([], <HostOfferActions offer={counteredPodOffer({ free_pod: true, counters_per_side: 0 })} subject={subject} onDone={vi.fn()} />);
    expect(screen.queryByTestId('host-offer-counter')).not.toBeInTheDocument();
    expect(screen.getByTestId('counter-allowance-host')).toHaveTextContent(NO_COUNTERS);
    fireEvent.click(screen.getByTestId('host-offer-accept'));
    expect(screen.getByRole('dialog')).toHaveTextContent('goes live at Skyline Banquets');
    expect(screen.getByRole('dialog')).not.toHaveTextContent('The venue receives');
  });

  it("names no amount in the host's accept when the page says the pod is free", () => {
    withApollo([], <HostOfferActions offer={counteredPodOffer()} subject={subject} podIsFree onDone={vi.fn()} />);
    fireEvent.click(screen.getByTestId('host-offer-accept'));
    expect(screen.getByRole('dialog')).not.toHaveTextContent('The venue receives');
  });
});

describe('the pinned bar on a free booking', () => {
  it('says it is only accepted or declined while it is open, instead of counting counters', () => {
    const offer = { status: 'SENT', awaiting: 'VENUE', expires_at: null, counters_per_side: 0, host_counters_used: 0, venue_counters_used: 0, model: 'FREE' };
    withApollo([], <VenueOfferPinnedBar offer={offer} side="VENUE" />);
    expect(screen.getByTestId('venue-offer-pin-counters')).toHaveTextContent(NO_COUNTERS);
  });
});

describe('a free venue in the venue chat', () => {
  it("shows the venue the host's free offer with its reason, no money, and only accept or reject", () => {
    withApollo([], <OfferChatCard move={freeMove()} viewer="VENUE" newest answering={{ live: liveFree(), subject, onAnswered: vi.fn() }} />);
    const card = within(screen.getByRole('article'));
    expect(card.getByTestId('offer-move-terms')).toHaveTextContent('Free venue');
    expect(card.queryByTestId('offer-money')).not.toBeInTheDocument();
    expect(card.getByTestId('offer-free-reason')).toHaveTextContent('Requested free — Promotional offer: Launch week');
    expect(card.getByTestId('offer-accept-slot-1')).toBeInTheDocument();
    expect(card.queryByTestId('offer-counter-slot-1')).not.toBeInTheDocument();
    expect(card.getByTestId('counter-allowance-venue')).toHaveTextContent(NO_COUNTERS);
  });

  it('keeps the reason to the offer line itself, and to the live offer it belongs to', () => {
    withApollo([], <OfferChatCard move={freeMove({ event: 'ACCEPTED', by: 'VENUE' })} viewer="VENUE" newest answering={{ live: liveFree({ status: 'ACCEPTED', awaiting: null }), subject, onAnswered: vi.fn() }} />);
    expect(screen.queryByTestId('offer-free-reason')).not.toBeInTheDocument();
  });

  it('names no reason from a live offer on another booking', () => {
    withApollo([], <OfferChatCard move={freeMove()} viewer="VENUE" newest={false} answering={{ live: liveFree({ slot_id: 'slot-2' }), subject, onAnswered: vi.fn() }} />);
    expect(screen.queryByTestId('offer-free-reason')).not.toBeInTheDocument();
  });
});

describe('a counter the server refuses because the booking is free', () => {
  it('says the booking can only be accepted or declined, and keeps the dialog open', async () => {
    const quoted = () => ({ data: { venueCounterQuote: { __typename: 'VenueOfferQuoteResult', ok: true, message: null, quote: flatQuote, quote_min: flatQuote } } });
    const refused = () => ({
      errors: [new GraphQLError('This booking is free — the venue can only accept or decline it', { extensions: { code: 'BAD_REQUEST', reason: 'FREE_NO_COUNTER' } })],
    });
    const onDone = vi.fn();
    withApollo([mockOf(VENUE_COUNTER_QUOTE, quoted), mockOf(COUNTER_VENUE_OFFER, refused)], <OfferRequestCard request={makeRequest()} onDone={onDone} />);
    fireEvent.click(screen.getByTestId('offer-counter-slot-1'));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByTestId('counter-offer-submit'));
    expect(await dialog.findByText(NO_COUNTERS, {}, SETTLED)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
