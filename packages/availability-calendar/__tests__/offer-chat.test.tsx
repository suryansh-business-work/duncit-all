import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { notifySuccess } from '@duncit/dialogs';
import type { VenueChatOfferMove } from '@duncit/utils';
import OfferChatCard from '../src/offers/chat/OfferChatCard';
import type { OfferChatAnswering } from '../src/offers/chat/OfferChatActions';
import { isOfferChatLine, type OfferChatViewer } from '../src/offers/chat/chat-lines';
import VenueChatContactLine from '../src/offers/chat/VenueChatContactLine';
import { REJECT_VENUE_COUNTER, type PodOffer } from '../src/offers/host/queries';
import { ACCEPT_VENUE_OFFER } from '../src/offers/queries';
import { SETTLED, counteredPodOffer, makeMove, makePodOffer, mockOf, withApollo, type Vars } from './offer-fixtures';

vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<object>()), notifySuccess: vi.fn(), notify: vi.fn() }));

const subject = { pod_id: 'pod-1', pod_title: 'Pottery night', venue_name: 'Skyline Banquets' };
const venueCounter = makeMove({
  event: 'COUNTER',
  by: 'VENUE',
  round: 2,
  model: 'FLAT',
  rate: 7000,
  min_guests: 20,
  offerings: [],
  note: 'Weekend rate',
  space_label: '',
  venue_receives_min: 7000,
  venue_receives_max: 7000,
  total_min: 7700,
  total_max: 7700,
});

interface Options {
  viewer?: OfferChatViewer;
  newest?: boolean;
  live?: PodOffer | null;
  onSendNewOffer?: (move: VenueChatOfferMove) => void;
  mocks?: Parameters<typeof withApollo>[0];
  podIsFree?: boolean;
}

function renderCard(move: VenueChatOfferMove, { viewer = 'VENUE', newest = true, live = makePodOffer(), onSendNewOffer, mocks = [], podIsFree }: Options = {}) {
  const onAnswered = vi.fn();
  const answering: OfferChatAnswering = { live, subject, onAnswered, onSendNewOffer };
  withApollo(mocks, <OfferChatCard move={move} viewer={viewer} newest={newest} answering={viewer === 'STAFF' ? undefined : answering} podIsFree={podIsFree} />);
  return { onAnswered, card: within(screen.getByRole('article')) };
}

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
});

describe('isOfferChatLine', () => {
  it('draws a card only for an OFFER line carrying a move this client knows', () => {
    expect(isOfferChatLine({ type: 'OFFER', offer: makeMove() })).toBe(true);
    expect(isOfferChatLine({ type: 'OFFER', offer: makeMove({ event: 'EXPIRED', by: 'SYSTEM' }) })).toBe(true);
    expect(isOfferChatLine({ type: 'OFFER', offer: null })).toBe(false);
    expect(isOfferChatLine({ type: 'TEXT', offer: makeMove() })).toBe(false);
    expect(isOfferChatLine({ type: 'OFFER', offer: makeMove({ event: 'WITHDRAWN' }) })).toBe(false);
    expect(isOfferChatLine({ type: 'OFFER', offer: makeMove({ by: 'VENUE', event: 'OFFER' }) })).toBe(false);
  });
});

describe('OfferChatCard', () => {
  it("shows the venue the host's open offer in full, with its answers", () => {
    const { card } = renderCard(makeMove({ pets: true }));
    expect(screen.getByRole('article', { name: 'New booking offer' })).toBeInTheDocument();
    expect(card.getByRole('heading', { level: 3 })).toHaveTextContent('New booking offer');
    expect(card.getByTestId('offer-move-terms')).toHaveTextContent('Per guest · ₹300 per guest');
    expect(card.getByText('8–20 guests · Pets are coming')).toBeInTheDocument();
    expect(card.getByText('Terrace')).toBeInTheDocument();
    expect(card.getByText(/^You receive/)).toHaveTextContent('You receive ₹2,400 – ₹6,000');
    expect(card.getByText(/^The host pays/)).toHaveTextContent('₹2,640 – ₹6,600');
    expect(card.getByRole('list', { name: 'What the venue provides' })).toHaveTextContent('10 chairs');
    expect(card.getByText('Note from the host')).toBeInTheDocument();
    expect(card.getByTestId('offer-answer-by')).toHaveTextContent(/^Answer by \S/);
    expect(card.getByTestId('offer-accept-slot-1')).toBeInTheDocument();
    expect(card.getByTestId('offer-counter-slot-1')).toBeInTheDocument();
    expect(card.getByTestId('offer-reject-slot-1')).toBeInTheDocument();
  });

  it('lets the venue accept it for the round on the line, then re-reads the offer', async () => {
    const sent: Vars[] = [];
    const ok = () => ({ data: { approveVenueSlotRequest: { __typename: 'VenueSlot', id: 'slot-1', status: 'BOOKED' } } });
    const { onAnswered } = renderCard(makeMove(), { mocks: [mockOf(ACCEPT_VENUE_OFFER, ok, sent)] });
    fireEvent.click(screen.getByTestId('offer-accept-slot-1'));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText(/goes live at Skyline Banquets/)).toHaveTextContent('“Pottery night”');
    fireEvent.click(dialog.getByTestId('answer-offer-submit'));
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1), SETTLED);
    expect(sent).toEqual([{ slot_id: 'slot-1', round: 1 }]);
  });

  it("shows the host the venue's counter as one amount of what it costs the pod, with the host's answers", async () => {
    const sent: Vars[] = [];
    const { card, onAnswered } = renderCard(venueCounter, {
      viewer: 'HOST',
      live: counteredPodOffer(),
      mocks: [mockOf(REJECT_VENUE_COUNTER, () => ({ data: { rejectVenueCounterOffer: true } }), sent)],
    });
    expect(card.getByRole('heading')).toHaveTextContent('The venue countered');
    expect(card.getByText('20 guests')).toBeInTheDocument();
    expect(card.getByText('Whole venue')).toBeInTheDocument();
    expect(card.getByText(/^Costs the pod/)).toHaveTextContent('Costs the pod ₹7,700');
    expect(card.getByText(/^The venue receives/)).toHaveTextContent('The venue receives ₹7,000');
    expect(card.getByText('Note from the venue')).toBeInTheDocument();
    expect(card.queryByRole('list')).not.toBeInTheDocument();

    fireEvent.click(card.getByTestId('host-offer-reject'));
    fireEvent.click(within(screen.getByRole('dialog')).getByTestId('answer-offer-submit'));
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1), SETTLED);
    expect(sent).toEqual([{ pod_id: 'pod-1', reason: null, round: 2 }]);
  });

  it('reads the host their own offer as theirs, with nothing to answer while the venue decides', () => {
    const { card } = renderCard(makeMove(), { viewer: 'HOST' });
    expect(card.getByRole('heading')).toHaveTextContent('You sent an offer');
    expect(card.getByTestId('offer-answer-by')).toBeInTheDocument();
    expect(card.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers nothing, and no answer-by, on an older line or a line the offer has moved past', () => {
    renderCard(makeMove(), { newest: false });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('offer-answer-by')).not.toBeInTheDocument();
  });

  it('offers no answer once the live offer is on another round', () => {
    renderCard(makeMove(), { live: makePodOffer({ round: 3 }) });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('lets a host send a new offer from the declined line, with the move it declined', () => {
    const onSendNewOffer = vi.fn();
    const declined = makeMove({ event: 'DECLINED', by: 'VENUE', reason: 'Fully booked that night', expires_at: null });
    const { card } = renderCard(declined, { viewer: 'HOST', live: null, onSendNewOffer });
    expect(card.getByRole('heading')).toHaveTextContent('The venue declined the offer');
    expect(card.getByTestId('offer-move-reason')).toHaveTextContent('Reason: Fully booked that night');
    expect(card.queryByTestId('offer-answer-by')).not.toBeInTheDocument();
    fireEvent.click(card.getByRole('button', { name: 'Send a new offer' }));
    expect(onSendNewOffer).toHaveBeenCalledWith(declined);
  });

  it('offers no new offer where the surface cannot send one, nor to the venue', () => {
    renderCard(makeMove({ event: 'EXPIRED', by: 'SYSTEM' }), { viewer: 'HOST', live: null });
    expect(screen.getByRole('heading')).toHaveTextContent('The offer expired — no answer in time');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('gives the venue no new offer on a line it declined, and no reason line without a reason', () => {
    renderCard(makeMove({ event: 'DECLINED', by: 'VENUE' }), { live: null, onSendNewOffer: vi.fn() });
    expect(screen.getByRole('heading')).toHaveTextContent('You declined the offer');
    expect(screen.queryByTestId('offer-move-reason')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('reads as a record to Duncit staff: third-person headings, the pod’s money, and no buttons', () => {
    renderCard(venueCounter, { viewer: 'STAFF' });
    expect(screen.getByRole('heading')).toHaveTextContent('The venue countered');
    expect(screen.getByText(/^Costs the pod/)).toBeInTheDocument();
    expect(screen.queryByText(/^You receive/)).not.toBeInTheDocument();
    expect(screen.getByTestId('offer-answer-by')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('names no money on a free pod, whose host settles the venue directly — each side reads it as theirs', () => {
    renderCard(makeMove(), { podIsFree: true });
    expect(screen.getByTestId('offer-move-free')).toHaveTextContent('Free pod: the host settles your charges with you directly');
    expect(screen.queryByText(/^You receive/)).not.toBeInTheDocument();
    // Accepting names no amount either.
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('goes live at');
    expect(screen.getByRole('dialog')).not.toHaveTextContent('you receive');
  });

  it("tells the host of a free pod that they settle the venue's charges themselves", () => {
    renderCard(venueCounter, { viewer: 'HOST', live: counteredPodOffer(), podIsFree: true });
    expect(screen.getByTestId('offer-move-free')).toHaveTextContent("Free pod: you settle the venue's charges with it directly");
    expect(screen.queryByText(/^Costs the pod/)).not.toBeInTheDocument();
  });

  it("reads the host's move to staff from the venue's side of the table", () => {
    renderCard(makeMove({ event: 'ACCEPTED', by: 'HOST' }), { viewer: 'STAFF' });
    expect(screen.getByRole('heading')).toHaveTextContent('The host accepted — booking confirmed');
    expect(screen.queryByTestId('offer-answer-by')).not.toBeInTheDocument();
  });
});

describe('VenueChatContactLine', () => {
  it('draws nothing without a way to reach the other side', () => {
    const { container } = withApollo([], <VenueChatContactLine contact={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names them, dials their phone and mails their email', () => {
    withApollo([], <VenueChatContactLine contact={{ name: 'Ravi', phone: '+91 98000-00000', email: 'ravi@venue.test' }} />);
    expect(screen.getByText('Ravi')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Phone +91 98000-00000' })).toHaveAttribute('href', 'tel:+919800000000');
    expect(screen.getByRole('link', { name: 'Email ravi@venue.test' })).toHaveAttribute('href', 'mailto:ravi@venue.test');
  });

  it('shows only what is on record', () => {
    withApollo([], <VenueChatContactLine contact={{ name: null, phone: null, email: 'ravi@venue.test' }} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByTestId('venue-chat-contact')).toHaveTextContent('ravi@venue.test');
  });
});
