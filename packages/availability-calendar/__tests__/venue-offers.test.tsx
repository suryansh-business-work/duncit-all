import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { notify, notifySuccess } from '@duncit/dialogs';
import VenueOfferInbox from '../src/offers/VenueOfferInbox';
import OfferRequestCard from '../src/offers/OfferRequestCard';
import OfferHistory from '../src/offers/OfferHistory';
import OfferTermsPanel from '../src/offers/OfferTermsPanel';
import { offerGuestsLabel, offerTermsLabel, rupeesRange } from '../src/offers/format';
import { ACCEPT_VENUE_OFFER, REJECT_VENUE_OFFER, VENUE_BOOKING_REQUESTS, type BookingRequestRow } from '../src/offers/queries';
import {
  SETTLED,
  failWith,
  flatQuote,
  makeCounter,
  makeOffer,
  makeRequest,
  mockOf,
  offerChanged,
  withApollo,
  type Vars,
} from './offer-fixtures';

vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<object>()), notifySuccess: vi.fn(), notify: vi.fn() }));

const okSlot = (field: string) => () => ({ data: { [field]: { __typename: 'VenueSlot', id: 'slot-1', status: 'BOOKED' } } });

const renderCard = (request: BookingRequestRow, mocks: Parameters<typeof withApollo>[0] = [], onDone = vi.fn()) => {
  withApollo(mocks, <OfferRequestCard request={request} onDone={onDone} />);
  return onDone;
};

const dialog = () => within(screen.getByRole('dialog'));

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notify).mockClear();
});

describe('offer formatting', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) => (options?.vars ? `${key}${JSON.stringify(options.vars)}` : key);

  it('names the option and its amount, or just the amount for an option this client does not know', () => {
    expect(offerTermsLabel(t, 'PER_HOUR', 1500)).toContain('availability.offers.termsLine');
    expect(offerTermsLabel(t, 'PER_DAY', 1500)).toMatch(/1,500/);
  });

  it('reads the guests as a range only when the venue is paid for fewer than the pod holds', () => {
    expect(offerGuestsLabel(t, 8, 20)).toBe('availability.offers.guestRange{"min":8,"max":20}');
    expect(offerGuestsLabel(t, 0, 20)).toBe('availability.offers.guests{"n":20}');
    expect(offerGuestsLabel(t, 20, 20)).toBe('availability.offers.guests{"n":20}');
  });

  it('writes one amount when both ends agree, else the range', () => {
    expect(rupeesRange(6000, 6000)).toBe('₹6,000');
    expect(rupeesRange(2400, 6000)).toBe('₹2,400 – ₹6,000');
  });
});

describe('OfferTermsPanel', () => {
  it("shows the host's offer, where it stands, the money as a range and the breakdown at the most guests", () => {
    withApollo([], <OfferTermsPanel offer={makeOffer()} podIsFree={false} />);
    expect(screen.getByText('Host offered')).toBeInTheDocument();
    expect(screen.getByTestId('offer-status')).toHaveTextContent('Waiting for your answer');
    // The money line, not the breakdown's own payout row below it.
    expect(within(screen.getByTestId('offer-money')).getByText(/^You receive/)).toHaveTextContent('You receive ₹2,400 – ₹6,000');
    expect(screen.getByText(/The host pays/)).toHaveTextContent('₹2,640 – ₹6,600');
    expect(screen.getByTestId('offer-breakdown-at')).toHaveTextContent('Breakdown at 20 guests');
    expect(screen.getByTestId('price-breakdown')).toBeInTheDocument();
  });

  it('lists what the host asks of the venue, the note, and until when to answer', () => {
    withApollo([], <OfferTermsPanel offer={makeOffer({ offerings: ['10 chairs', 'A projector', '10 chairs'] })} podIsFree={false} />);
    const points = within(screen.getByRole('list', { name: 'What the venue provides' })).getAllByRole('listitem');
    expect(points.map((point) => point.textContent)).toEqual(['10 chairs', 'A projector']);
    expect(screen.getByText('Note from the host')).toBeInTheDocument();
    expect(screen.getByText('We will bring our own speakers.')).toBeInTheDocument();
    expect(screen.getByTestId('offer-answer-by')).toHaveTextContent(/^Answer by \S/);
  });

  it("shows the venue's counter as one amount, with its own points and note", () => {
    const offer = makeOffer({
      status: 'COUNTERED',
      awaiting: 'HOST',
      counter: makeCounter({ offerings: ['A stage'], note: 'Weekend rate' }),
    });
    withApollo([], <OfferTermsPanel offer={offer} podIsFree={false} />);
    expect(screen.getByText('Your counter')).toBeInTheDocument();
    expect(screen.getByTestId('offer-status')).toHaveTextContent('You countered — waiting for the host');
    expect(within(screen.getByTestId('offer-money')).getByText(/^You receive/)).toHaveTextContent('You receive ₹7,000');
    expect(screen.queryByTestId('offer-breakdown-at')).not.toBeInTheDocument();
    expect(screen.getByText('A stage')).toBeInTheDocument();
    expect(screen.getByText('Note from the venue')).toBeInTheDocument();
    expect(screen.getByText('Weekend rate')).toBeInTheDocument();
  });

  it('quotes nothing for a free pod, shows no chip for a status it does not know, and no answer-by once closed', () => {
    withApollo([], <OfferTermsPanel offer={makeOffer({ status: 'EXPIRED', offerings: [], note: '' })} podIsFree />);
    expect(screen.getByText(/Free pod: the host settles/)).toBeInTheDocument();
    expect(screen.queryByTestId('offer-status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('offer-money')).not.toBeInTheDocument();
    expect(screen.queryByTestId('offer-ask')).not.toBeInTheDocument();
    expect(screen.queryByTestId('offer-answer-by')).not.toBeInTheDocument();
  });

  it('shows no answer-by on an open offer from before deadlines', () => {
    withApollo([], <OfferTermsPanel offer={makeOffer({ expires_at: null, offerings: [] })} podIsFree={false} />);
    expect(screen.queryByTestId('offer-answer-by')).not.toBeInTheDocument();
    expect(screen.getByTestId('offer-ask')).toHaveTextContent('We will bring our own speakers.');
  });
});

describe('OfferHistory', () => {
  it('draws nothing without a step it can name', () => {
    const { container } = withApollo([], <OfferHistory history={[{ by: 'STAFF', action: 'OFFER', model: null, rate: null, total: null, note: '', at: null }]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each step, the fewest guests it named, its time and its note', () => {
    withApollo(
      [],
      <OfferHistory
        history={[
          { by: 'HOST', action: 'OFFER', model: 'PER_GUEST', rate: 300, min_guests: 8, total: 6600, note: '', at: '2026-12-01T06:30:00.000Z' },
          { by: 'VENUE', action: 'COUNTER', model: 'FLAT', rate: 7000, min_guests: 0, total: 7700, note: 'Weekend rate', at: null },
          { by: 'HOST', action: 'REJECT', model: null, rate: null, total: null, note: '', at: null },
          { by: 'HOST', action: 'ACCEPT', model: 'FLAT', rate: null, total: null, note: '', at: null },
        ]}
      />,
    );
    const list = within(screen.getByTestId('offer-history'));
    expect(list.getByText(/The host offered/)).toHaveTextContent('Per guest · ₹300 per guest · at least 8 guests');
    expect(list.getByText(/You countered with/)).toHaveTextContent('You countered with Flat price · ₹7,000 flat');
    expect(list.getByText(/You countered with/)).not.toHaveTextContent('at least');
    expect(list.getByText('“Weekend rate”')).toBeInTheDocument();
    expect(list.getByText('The host declined your counter')).toBeInTheDocument();
    expect(list.getByText(/The host accepted/)).toBeInTheDocument();
  });
});

describe('OfferRequestCard', () => {
  it('shows the pod, who asks, when, the guests from the minimum to the spots, and the space', () => {
    renderCard(makeRequest({ offer: makeOffer({ pets: true, space_label: 'Terrace' }) }));
    const card = within(screen.getByTestId('booking-request-slot-1'));
    expect(card.getByText('Pottery night')).toBeInTheDocument();
    expect(card.getByText('Terrace')).toBeInTheDocument();
    expect(card.getByText('Asha')).toBeInTheDocument();
    expect(card.getByText('asha@example.com · +919800000000')).toBeInTheDocument();
    expect(card.getByText('8–20 guests · Pets are coming')).toBeInTheDocument();
    expect(card.getByTestId('offer-history')).toBeInTheDocument();
  });

  it("reads the guests from the venue's counter while it is on the table", () => {
    renderCard(makeRequest({ offer: makeOffer({ status: 'COUNTERED', awaiting: 'HOST', counter: makeCounter({ model: 'PER_GUEST', min_guests: 12 }) }) }));
    expect(screen.getByText('12–20 guests')).toBeInTheDocument();
  });

  it('falls back to the whole venue, a plain head count and dashes for missing details', () => {
    renderCard(makeRequest({ host_name: '', host_email: '', host_phone: '', whole_day: true, offer: makeOffer({ min_guests: 0 }) }));
    const card = within(screen.getByTestId('booking-request-slot-1'));
    expect(card.getByText('Whole venue')).toBeInTheDocument();
    expect(card.getAllByText('—')).toHaveLength(2);
    expect(card.getByText('20 guests')).toBeInTheDocument();
  });

  it('answers a request from before offers with its slot price, accept and reject only', () => {
    renderCard(makeRequest({ offer: null }));
    expect(screen.getByText(/came in before booking offers/)).toHaveTextContent('4,500');
    expect(screen.queryByText('Guests')).not.toBeInTheDocument();
    expect(screen.getByTestId('offer-accept-slot-1')).toBeInTheDocument();
    expect(screen.getByTestId('offer-reject-slot-1')).toBeInTheDocument();
    expect(screen.queryByTestId('offer-counter-slot-1')).not.toBeInTheDocument();
  });

  it('quotes no price on an old free-pod request', () => {
    renderCard(makeRequest({ offer: null, pod_is_free: true }));
    expect(screen.getByText(/came in before booking offers/)).not.toHaveTextContent('4,500');
  });

  it('lets the venue change or withdraw its counter, but not accept it', () => {
    renderCard(makeRequest({ offer: makeOffer({ status: 'COUNTERED', awaiting: 'HOST', counter: makeCounter() }) }));
    expect(screen.getByTestId('offer-counter-slot-1')).toHaveTextContent('Change counter');
    expect(screen.getByTestId('offer-reject-slot-1')).toBeInTheDocument();
    expect(screen.queryByTestId('offer-accept-slot-1')).not.toBeInTheDocument();
  });

  it('offers no answer once the request is settled', () => {
    renderCard(makeRequest({ offer: makeOffer({ status: 'ACCEPTED', awaiting: null }) }));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('accepting and rejecting', () => {
  it('accepts the round it read, after naming what goes live and what the venue receives at either end', async () => {
    const sent: Vars[] = [];
    const onDone = renderCard(makeRequest(), [mockOf(ACCEPT_VENUE_OFFER, okSlot('approveVenueSlotRequest'), sent)]);
    fireEvent.click(screen.getByTestId('offer-accept-slot-1'));
    expect(dialog().getByText('Accept this booking?')).toBeInTheDocument();
    expect(dialog().getByText(/goes live at Skyline Banquets/)).toHaveTextContent('you receive ₹2,400 – ₹6,000');
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), SETTLED);
    expect(sent).toEqual([{ slot_id: 'slot-1', round: 1 }]);
    expect(notifySuccess).toHaveBeenCalledWith('Booking accepted — the pod is now live.');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });

  it('accepts a request from before offers without a round, naming its slot price', async () => {
    const sent: Vars[] = [];
    renderCard(makeRequest({ offer: null }), [mockOf(ACCEPT_VENUE_OFFER, okSlot('approveVenueSlotRequest'), sent)]);
    fireEvent.click(screen.getByTestId('offer-accept-slot-1'));
    expect(dialog().getByText(/goes live at Skyline Banquets/)).toHaveTextContent('you receive ₹4,500');
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(sent).toEqual([{ slot_id: 'slot-1' }]), SETTLED);
  });

  it('names no amount when accepting a free pod', () => {
    renderCard(makeRequest({ pod_is_free: true }));
    fireEvent.click(screen.getByTestId('offer-accept-slot-1'));
    expect(dialog().getByText(/goes live at Skyline Banquets/)).not.toHaveTextContent('6,000');
  });

  it('rejects the round it read with a trimmed reason, or none', async () => {
    const sent: Vars[] = [];
    renderCard(makeRequest(), [mockOf(REJECT_VENUE_OFFER, okSlot('declineVenueSlotRequest'), sent)]);
    fireEvent.click(screen.getByTestId('offer-reject-slot-1'));
    expect(dialog().getByText('Reject this booking?')).toBeInTheDocument();
    fireEvent.change(dialog().getByLabelText('Reason for the host (optional)'), { target: { value: '  Fully booked  ' } });
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(sent).toEqual([{ slot_id: 'slot-1', reason: 'Fully booked', round: 1 }]), SETTLED);
    expect(notifySuccess).toHaveBeenCalledWith('Booking rejected — the host has been told.');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
    fireEvent.click(screen.getByTestId('offer-reject-slot-1'));
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(sent).toHaveLength(2), SETTLED);
    expect(sent[1]).toEqual({ slot_id: 'slot-1', reason: null, round: 1 });
  });

  it('keeps the reason within 280 characters', async () => {
    const sent: Vars[] = [];
    renderCard(makeRequest(), [mockOf(REJECT_VENUE_OFFER, okSlot('declineVenueSlotRequest'), sent)]);
    fireEvent.click(screen.getByTestId('offer-reject-slot-1'));
    fireEvent.change(dialog().getByLabelText('Reason for the host (optional)'), { target: { value: 'x'.repeat(281) } });
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    expect(await dialog().findByText('Keep the note under 280 characters')).toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });

  it("shows the server's reason and stays open when the answer is refused", async () => {
    const onDone = renderCard(makeRequest(), [mockOf(ACCEPT_VENUE_OFFER, failWith('This request has expired'))]);
    fireEvent.click(screen.getByTestId('offer-accept-slot-1'));
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    expect(await dialog().findByText('This request has expired')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
    fireEvent.click(dialog().getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });

  it('says the terms changed, closes and re-reads when the host moved first', async () => {
    const onDone = renderCard(makeRequest(), [mockOf(ACCEPT_VENUE_OFFER, offerChanged())]);
    fireEvent.click(screen.getByTestId('offer-accept-slot-1'));
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), SETTLED);
    expect(notify).toHaveBeenCalledWith('The terms changed while you were reading them. Here are the latest.', 'warning');
    expect(notifySuccess).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });

  it('still closes when the re-read after a changed offer fails', async () => {
    const onDone = vi.fn().mockRejectedValue(new Error('offline'));
    renderCard(makeRequest(), [mockOf(REJECT_VENUE_OFFER, offerChanged())], onDone);
    fireEvent.click(screen.getByTestId('offer-reject-slot-1'));
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), SETTLED);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });

  it('closes once the answer is saved even if the list fails to refresh', async () => {
    const onDone = vi.fn().mockRejectedValue(new Error('offline'));
    renderCard(makeRequest(), [mockOf(ACCEPT_VENUE_OFFER, okSlot('approveVenueSlotRequest'))], onDone);
    fireEvent.click(screen.getByTestId('offer-accept-slot-1'));
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), SETTLED);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });
});

describe('chat with the host', () => {
  it('shows no chat button when the app passes no chat link (the Partners console)', () => {
    renderCard(makeRequest());
    expect(screen.queryByTestId('booking-request-chat-slot-1')).not.toBeInTheDocument();
  });

  it("opens the request's pod chat under the app's own label", () => {
    const onOpen = vi.fn();
    withApollo([], <OfferRequestCard request={makeRequest()} onDone={vi.fn()} chat={{ label: 'Chat with host', onOpen }} />);
    const button = screen.getByTestId('booking-request-chat-slot-1');
    expect(button).toHaveTextContent('Chat with host');
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledWith('pod-1');
  });
});

describe('VenueOfferInbox', () => {
  const listMock = (rows: BookingRequestRow[], seen: Vars[] = []) => mockOf(VENUE_BOOKING_REQUESTS, () => ({ data: { venueSlotRequests: rows } }), seen);

  it('hands the chat link to every request it lists', async () => {
    const onOpen = vi.fn();
    withApollo([listMock([makeRequest()])], <VenueOfferInbox venueId="venue-1" chat={{ label: 'Chat with host', onOpen }} />);
    fireEvent.click(await screen.findByTestId('booking-request-chat-slot-1'));
    expect(onOpen).toHaveBeenCalledWith('pod-1');
  });

  it("lists one venue's requests", async () => {
    const seen: Vars[] = [];
    withApollo([listMock([makeRequest()], seen)], <VenueOfferInbox venueId="venue-1" />);
    expect(screen.getByLabelText('Loading booking requests…')).toBeInTheDocument();
    expect(await screen.findByTestId('booking-request-slot-1')).toBeInTheDocument();
    expect(seen[0]).toEqual({ venue_id: 'venue-1' });
  });

  it('reads a counter with all its terms from the list', async () => {
    const offer = makeOffer({ status: 'COUNTERED', awaiting: 'HOST', counter: makeCounter({ quote: flatQuote }) });
    withApollo([listMock([makeRequest({ offer })])], <VenueOfferInbox venueId={null} />);
    expect(await screen.findByText('Your counter')).toBeInTheDocument();
  });

  it('says when nothing is waiting', async () => {
    withApollo([listMock([])], <VenueOfferInbox venueId={null} />);
    expect(await screen.findByText('No booking requests are waiting right now.')).toBeInTheDocument();
  });

  it('says when the list cannot load', async () => {
    withApollo([mockOf(VENUE_BOOKING_REQUESTS, failWith('down'))], <VenueOfferInbox venueId={null} />);
    expect(await screen.findByText("We couldn't load the booking requests. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText('No booking requests are waiting right now.')).not.toBeInTheDocument();
  });

  it('re-reads the list, then tells the page, after an answer', async () => {
    const seen: Vars[] = [];
    const onAnswered = vi.fn();
    withApollo([listMock([makeRequest()], seen), mockOf(ACCEPT_VENUE_OFFER, okSlot('approveVenueSlotRequest'))], <VenueOfferInbox venueId={null} onAnswered={onAnswered} />);
    fireEvent.click(await screen.findByTestId('offer-accept-slot-1'));
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1), SETTLED);
    expect(seen.length).toBeGreaterThanOrEqual(2);
  });

  it('re-reads the list on its own when the page does not listen', async () => {
    const seen: Vars[] = [];
    withApollo([listMock([makeRequest()], seen), mockOf(ACCEPT_VENUE_OFFER, okSlot('approveVenueSlotRequest'))], <VenueOfferInbox venueId={null} />);
    fireEvent.click(await screen.findByTestId('offer-accept-slot-1'));
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(seen.length).toBeGreaterThanOrEqual(2), SETTLED);
  });
});
