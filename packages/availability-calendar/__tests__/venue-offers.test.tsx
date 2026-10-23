import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { notifySuccess } from '@duncit/dialogs';
import VenueOfferInbox from '../src/offers/VenueOfferInbox';
import OfferRequestCard from '../src/offers/OfferRequestCard';
import OfferHistory from '../src/offers/OfferHistory';
import OfferTermsPanel from '../src/offers/OfferTermsPanel';
import { offerTermsLabel } from '../src/offers/format';
import { useCounterQuote } from '../src/offers/useCounterQuote';
import {
  ACCEPT_VENUE_OFFER,
  COUNTER_VENUE_OFFER,
  REJECT_VENUE_OFFER,
  VENUE_BOOKING_REQUESTS,
  VENUE_COUNTER_QUOTE,
  type BookingOffer,
  type BookingRequestRow,
} from '../src/offers/queries';
import { breakdownResult, makeBreakdown } from './pricing-fixtures';

vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<object>()), notifySuccess: vi.fn() }));

const SETTLED = { timeout: 3000 };
const quote = breakdownResult(makeBreakdown({ model: 'PER_PAX', rate: 300, venue_payout: 6000, platform_fee: 600, total: 6600 }));
const counterQuote = breakdownResult(makeBreakdown({ model: 'FLAT', rate: 7000, base: 7000, venue_price: 7000, venue_payout: 7000, platform_fee: 700, total: 7700 }));

function makeOffer(over: Partial<BookingOffer> = {}): BookingOffer {
  return {
    __typename: 'VenueBookingOffer',
    slot_id: 'slot-1',
    status: 'SENT',
    round: 1,
    awaiting: 'VENUE',
    model: 'PER_GUEST',
    rate: 300,
    pax: 20,
    pets: false,
    space_label: '',
    quote,
    counter: null,
    history: [
      { __typename: 'VenueOfferHistoryEntry', by: 'HOST', action: 'OFFER', model: 'PER_GUEST', rate: 300, total: 6600, note: '', at: '2026-12-01T06:30:00.000Z' },
    ],
    ...over,
  } as BookingOffer;
}

function makeRequest(over: Partial<BookingRequestRow> = {}): BookingRequestRow {
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

function mockOf(query: MockedResponse['request']['query'], answer: (v: Record<string, any>) => object, seen: Record<string, any>[] = []): MockedResponse {
  return {
    request: { query, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: (variables: Record<string, any>) => {
      seen.push(variables);
      return answer(variables) as never;
    },
  };
}

const okSlot = (field: string) => () => ({ data: { [field]: { __typename: 'VenueSlot', id: 'slot-1', status: 'BOOKED' } } });
const failWith = (message: string) => () => ({ errors: [new GraphQLError(message)] });

const withApollo = (mocks: MockedResponse[], ui: ReactNode) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      {ui}
    </MockedProvider>,
  );

const renderCard = (mocks: MockedResponse[], request: BookingRequestRow, onDone = vi.fn()) => {
  withApollo(mocks, <OfferRequestCard request={request} onDone={onDone} />);
  return onDone;
};

const dialog = () => within(screen.getByRole('dialog'));

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
});

describe('offerTermsLabel', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) => (options?.vars ? `${key}${JSON.stringify(options.vars)}` : key);

  it('names the option and its amount', () => {
    expect(offerTermsLabel(t, 'PER_HOUR', 1500)).toContain('availability.offers.termsLine');
  });

  it('is just the amount for an option this client does not know', () => {
    expect(offerTermsLabel(t, 'PER_DAY', 1500)).toMatch(/1,500/);
  });
});

describe('OfferTermsPanel', () => {
  it("shows the host's offer, where it stands and the server's quote", () => {
    withApollo([], <OfferTermsPanel offer={makeOffer()} podIsFree={false} />);
    expect(screen.getByText('Host offered')).toBeInTheDocument();
    expect(screen.getByTestId('offer-status')).toHaveTextContent('Waiting for your answer');
    expect(screen.getByText(/^You receive ₹/)).toHaveTextContent('6,000');
    expect(screen.getByText(/The host pays/)).toHaveTextContent('6,600');
    expect(screen.getByTestId('price-breakdown')).toBeInTheDocument();
  });

  it("shows the venue's counter while the host decides", () => {
    const offer = makeOffer({
      status: 'COUNTERED',
      awaiting: 'HOST',
      counter: { model: 'FLAT', rate: 7000, note: 'Weekend', at: null, quote: counterQuote } as BookingOffer['counter'],
    });
    withApollo([], <OfferTermsPanel offer={offer} podIsFree={false} />);
    expect(screen.getByText('Your counter')).toBeInTheDocument();
    expect(screen.getByTestId('offer-status')).toHaveTextContent('You countered — waiting for the host');
    expect(screen.getByText(/^You receive ₹/)).toHaveTextContent('7,000');
  });

  it('quotes nothing for a free pod, and shows no chip for a status it does not know', () => {
    withApollo([], <OfferTermsPanel offer={makeOffer({ status: 'EXPIRED' })} podIsFree />);
    expect(screen.getByText(/Free pod/)).toBeInTheDocument();
    expect(screen.queryByTestId('offer-status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('price-breakdown')).not.toBeInTheDocument();
  });
});

describe('OfferHistory', () => {
  it('draws nothing without a step it can name', () => {
    const { container } = withApollo([], <OfferHistory history={[{ by: 'STAFF', action: 'OFFER', model: null, rate: null, total: null, note: '', at: null }]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each step, its time and its note', () => {
    withApollo(
      [],
      <OfferHistory
        history={[
          { by: 'HOST', action: 'OFFER', model: 'PER_GUEST', rate: 300, total: 6600, note: '', at: '2026-12-01T06:30:00.000Z' },
          { by: 'VENUE', action: 'COUNTER', model: 'FLAT', rate: 7000, total: 7700, note: 'Weekend rate', at: null },
          { by: 'HOST', action: 'REJECT', model: null, rate: null, total: null, note: '', at: null },
          { by: 'HOST', action: 'ACCEPT', model: 'FLAT', rate: null, total: null, note: '', at: null },
        ]}
      />,
    );
    const list = within(screen.getByTestId('offer-history'));
    expect(list.getByText(/The host offered/)).toBeInTheDocument();
    expect(list.getByText(/You countered with/)).toBeInTheDocument();
    expect(list.getByText('“Weekend rate”')).toBeInTheDocument();
    expect(list.getByText('The host declined your counter')).toBeInTheDocument();
    expect(list.getByText(/The host accepted/)).toBeInTheDocument();
  });
});

describe('OfferRequestCard', () => {
  it('shows the pod, who asks, when, the guests and the space', () => {
    renderCard([], makeRequest({ offer: makeOffer({ pets: true, space_label: 'Terrace' }) }));
    const card = within(screen.getByTestId('booking-request-slot-1'));
    expect(card.getByText('Pottery night')).toBeInTheDocument();
    expect(card.getByText('Terrace')).toBeInTheDocument();
    expect(card.getByText('Asha')).toBeInTheDocument();
    expect(card.getByText('asha@example.com · +919800000000')).toBeInTheDocument();
    expect(card.getByText('20 guests · Pets are coming')).toBeInTheDocument();
    expect(card.getByTestId('offer-history')).toBeInTheDocument();
  });

  it('falls back to the whole venue and dashes for missing details', () => {
    renderCard([], makeRequest({ host_name: '', host_email: '', host_phone: '', whole_day: true }));
    const card = within(screen.getByTestId('booking-request-slot-1'));
    expect(card.getByText('Whole venue')).toBeInTheDocument();
    expect(card.getAllByText('—')).toHaveLength(2);
    expect(card.getByText('20 guests')).toBeInTheDocument();
  });

  it('answers a request from before offers with its slot price, accept and reject only', () => {
    renderCard([], makeRequest({ offer: null }));
    expect(screen.getByText(/came in before booking offers/)).toHaveTextContent('4,500');
    expect(screen.queryByText('Guests')).not.toBeInTheDocument();
    expect(screen.getByTestId('offer-accept-slot-1')).toBeInTheDocument();
    expect(screen.getByTestId('offer-reject-slot-1')).toBeInTheDocument();
    expect(screen.queryByTestId('offer-counter-slot-1')).not.toBeInTheDocument();
  });

  it('quotes no price on an old free-pod request', () => {
    renderCard([], makeRequest({ offer: null, pod_is_free: true }));
    expect(screen.getByText(/came in before booking offers/)).not.toHaveTextContent('4,500');
  });

  it('lets the venue change or withdraw its counter, but not accept it', () => {
    renderCard([], makeRequest({ offer: makeOffer({ status: 'COUNTERED', awaiting: 'HOST' }) }));
    expect(screen.getByTestId('offer-counter-slot-1')).toHaveTextContent('Change counter');
    expect(screen.getByTestId('offer-reject-slot-1')).toBeInTheDocument();
    expect(screen.queryByTestId('offer-accept-slot-1')).not.toBeInTheDocument();
  });

  it('offers no answer once the request is settled', () => {
    renderCard([], makeRequest({ offer: makeOffer({ status: 'ACCEPTED', awaiting: null }) }));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('accepting and rejecting', () => {
  it('accepts after naming what goes live and what the venue receives', async () => {
    const sent: Record<string, any>[] = [];
    const onDone = renderCard([mockOf(ACCEPT_VENUE_OFFER, okSlot('approveVenueSlotRequest'), sent)], makeRequest());
    fireEvent.click(screen.getByTestId('offer-accept-slot-1'));
    expect(dialog().getByText('Accept this booking?')).toBeInTheDocument();
    expect(dialog().getByText(/goes live at Skyline Banquets/)).toHaveTextContent('6,000');
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), SETTLED);
    expect(sent).toEqual([{ slot_id: 'slot-1' }]);
    expect(notifySuccess).toHaveBeenCalledWith('Booking accepted — the pod is now live.');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });

  it('names no amount when accepting a free pod', () => {
    renderCard([], makeRequest({ pod_is_free: true }));
    fireEvent.click(screen.getByTestId('offer-accept-slot-1'));
    expect(dialog().getByText(/goes live at Skyline Banquets/)).not.toHaveTextContent('6,000');
  });

  it('rejects with a trimmed reason, or none', async () => {
    const sent: Record<string, any>[] = [];
    renderCard([mockOf(REJECT_VENUE_OFFER, okSlot('declineVenueSlotRequest'), sent)], makeRequest());
    fireEvent.click(screen.getByTestId('offer-reject-slot-1'));
    expect(dialog().getByText('Reject this booking?')).toBeInTheDocument();
    fireEvent.change(dialog().getByLabelText('Reason for the host (optional)'), { target: { value: '  Fully booked  ' } });
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(sent).toEqual([{ slot_id: 'slot-1', reason: 'Fully booked' }]), SETTLED);
    expect(notifySuccess).toHaveBeenCalledWith('Booking rejected — the host has been told.');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
    fireEvent.click(screen.getByTestId('offer-reject-slot-1'));
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(sent).toHaveLength(2), SETTLED);
    expect(sent[1]).toEqual({ slot_id: 'slot-1', reason: null });
  });

  it('keeps the reason within 280 characters', async () => {
    const sent: Record<string, any>[] = [];
    renderCard([mockOf(REJECT_VENUE_OFFER, okSlot('declineVenueSlotRequest'), sent)], makeRequest());
    fireEvent.click(screen.getByTestId('offer-reject-slot-1'));
    fireEvent.change(dialog().getByLabelText('Reason for the host (optional)'), { target: { value: 'x'.repeat(281) } });
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    expect(await dialog().findByText('Keep the note under 280 characters')).toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });

  it("shows the server's reason and stays open when the answer is refused", async () => {
    const onDone = renderCard([mockOf(ACCEPT_VENUE_OFFER, failWith('This request has expired'))], makeRequest());
    fireEvent.click(screen.getByTestId('offer-accept-slot-1'));
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    expect(await dialog().findByText('This request has expired')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
    fireEvent.click(dialog().getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });

  it('closes once the answer is saved even if the list fails to refresh', async () => {
    const onDone = vi.fn().mockRejectedValue(new Error('offline'));
    renderCard([mockOf(ACCEPT_VENUE_OFFER, okSlot('approveVenueSlotRequest'))], makeRequest(), onDone);
    fireEvent.click(screen.getByTestId('offer-accept-slot-1'));
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), SETTLED);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });
});

describe('countering', () => {
  const quoteOk = mockOf(VENUE_COUNTER_QUOTE, () => ({
    data: { venueCounterQuote: { __typename: 'VenueOfferQuoteResult', ok: true, message: null, quote: counterQuote } },
  }));
  const counterOk = (sent: Record<string, any>[]) =>
    mockOf(COUNTER_VENUE_OFFER, () => ({ data: { counterVenueOffer: { __typename: 'VenueBookingOffer', slot_id: 'slot-1', status: 'COUNTERED', round: 2 } } }), sent);

  const openCounter = () => {
    fireEvent.click(screen.getByTestId('offer-counter-slot-1'));
    return dialog();
  };

  it("starts from the host's terms, prices the venue's as typed, and sends them", async () => {
    const sent: Record<string, any>[] = [];
    const seen: Record<string, any>[] = [];
    const onDone = renderCard(
      [counterOk(sent), mockOf(VENUE_COUNTER_QUOTE, () => ({ data: { venueCounterQuote: { __typename: 'VenueOfferQuoteResult', ok: true, message: null, quote: counterQuote } } }), seen)],
      makeRequest(),
    );
    const form = openCounter();
    expect(form.getByText('Counter offer')).toBeInTheDocument();
    expect(form.getByLabelText('Amount (₹)')).toHaveValue(300);
    await waitFor(() => expect(seen).toContainEqual({ slot_id: 'slot-1', terms: { model: 'PER_GUEST', rate: 300 } }), SETTLED);

    fireEvent.mouseDown(form.getByRole('combobox', { name: /Pricing option/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Flat price' }));
    fireEvent.change(form.getByLabelText('Amount (₹)'), { target: { value: '7000' } });
    fireEvent.change(form.getByLabelText('Note to the host (optional)'), { target: { value: ' Weekend rate ' } });
    await waitFor(() => expect(seen).toContainEqual({ slot_id: 'slot-1', terms: { model: 'FLAT', rate: 7000 } }), SETTLED);
    expect(await within(screen.getByTestId('counter-offer-preview')).findByTestId('price-breakdown')).toBeInTheDocument();

    fireEvent.click(form.getByTestId('counter-offer-submit'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), SETTLED);
    expect(sent).toEqual([{ slot_id: 'slot-1', terms: { model: 'FLAT', rate: 7000 }, note: 'Weekend rate' }]);
    expect(notifySuccess).toHaveBeenCalledWith('Your counter was sent to the host.');
  });

  it('sends no note when none is written, and starts from the current counter', async () => {
    const sent: Record<string, any>[] = [];
    const offer = makeOffer({
      status: 'COUNTERED',
      awaiting: 'HOST',
      counter: { model: 'FLAT', rate: 7000, note: '', at: null, quote: counterQuote } as BookingOffer['counter'],
    });
    renderCard([counterOk(sent), quoteOk], makeRequest({ offer }));
    const form = openCounter();
    expect(form.getByLabelText('Amount (₹)')).toHaveValue(7000);
    fireEvent.click(form.getByTestId('counter-offer-submit'));
    await waitFor(() => expect(sent).toEqual([{ slot_id: 'slot-1', terms: { model: 'FLAT', rate: 7000 }, note: null }]), SETTLED);
  });

  it('asks for a usable amount before pricing or sending', async () => {
    const sent: Record<string, any>[] = [];
    const seen: Record<string, any>[] = [];
    renderCard([counterOk(sent), mockOf(VENUE_COUNTER_QUOTE, () => ({ data: { venueCounterQuote: { __typename: 'VenueOfferQuoteResult', ok: true, message: null, quote: counterQuote } } }), seen)], makeRequest());
    const form = openCounter();
    fireEvent.change(form.getByLabelText('Amount (₹)'), { target: { value: '0' } });
    fireEvent.click(form.getByTestId('counter-offer-submit'));
    expect(await form.findByText('Enter an amount above 0')).toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });

  it("shows why the server cannot take the terms, and when it cannot price them", async () => {
    renderCard(
      [mockOf(VENUE_COUNTER_QUOTE, () => ({ data: { venueCounterQuote: { __typename: 'VenueOfferQuoteResult', ok: false, message: 'This amount is too large', quote: null } } }))],
      makeRequest(),
    );
    const form = openCounter();
    expect(await form.findByText('This amount is too large', {}, SETTLED)).toBeInTheDocument();
  });

  it('says so when the price cannot be fetched', async () => {
    renderCard([mockOf(VENUE_COUNTER_QUOTE, failWith('down'))], makeRequest());
    const form = openCounter();
    expect(await form.findByText("We couldn't price these terms.", {}, SETTLED)).toBeInTheDocument();
  });

  it("keeps the dialog open with the server's reason when the counter is refused, and cancels cleanly", async () => {
    const onDone = renderCard([mockOf(COUNTER_VENUE_OFFER, failWith('This booking has already started')), quoteOk], makeRequest());
    const form = openCounter();
    fireEvent.click(form.getByTestId('counter-offer-submit'));
    expect(await form.findByText('This booking has already started', {}, SETTLED)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(form.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });
});

describe('VenueOfferInbox', () => {
  const listMock = (rows: BookingRequestRow[], seen: Record<string, any>[] = []) =>
    mockOf(VENUE_BOOKING_REQUESTS, () => ({ data: { venueSlotRequests: rows } }), seen);

  it("lists one venue's requests", async () => {
    const seen: Record<string, any>[] = [];
    withApollo([listMock([makeRequest()], seen)], <VenueOfferInbox venueId="venue-1" />);
    expect(screen.getByLabelText('Loading booking requests…')).toBeInTheDocument();
    expect(await screen.findByTestId('booking-request-slot-1')).toBeInTheDocument();
    expect(seen[0]).toEqual({ venue_id: 'venue-1' });
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
    const seen: Record<string, any>[] = [];
    const onAnswered = vi.fn();
    withApollo(
      [listMock([makeRequest()], seen), mockOf(ACCEPT_VENUE_OFFER, okSlot('approveVenueSlotRequest'))],
      <VenueOfferInbox venueId={null} onAnswered={onAnswered} />,
    );
    fireEvent.click(await screen.findByTestId('offer-accept-slot-1'));
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1), SETTLED);
    expect(seen.length).toBeGreaterThanOrEqual(2);
  });

  it('re-reads the list on its own when the page does not listen', async () => {
    const seen: Record<string, any>[] = [];
    withApollo([listMock([makeRequest()], seen), mockOf(ACCEPT_VENUE_OFFER, okSlot('approveVenueSlotRequest'))], <VenueOfferInbox venueId={null} />);
    fireEvent.click(await screen.findByTestId('offer-accept-slot-1'));
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(seen.length).toBeGreaterThanOrEqual(2), SETTLED);
  });
});

describe('useCounterQuote', () => {
  it('asks the server nothing and shows no price while the counter is not valid yet', async () => {
    const seen: Record<string, unknown>[] = [];
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[mockOf(VENUE_COUNTER_QUOTE, () => ({ data: { venueCounterQuote: null } }), seen)]}>
        {children}
      </MockedProvider>
    );
    const { result } = renderHook(() => useCounterQuote('slot-1', null), { wrapper });
    expect(result.current).toEqual({ result: null, loading: false, error: undefined });
    // Even after the debounce settles, no terms means no quote is requested.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(seen).toEqual([]);
    expect(result.current.result).toBeNull();
  });
});
