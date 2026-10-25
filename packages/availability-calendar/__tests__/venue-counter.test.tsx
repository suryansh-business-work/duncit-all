import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { notify, notifySuccess } from '@duncit/dialogs';
import OfferRequestCard from '../src/offers/OfferRequestCard';
import { useCounterQuote, venueCounterQuoteSource } from '../src/offers/useCounterQuote';
import { COUNTER_VENUE_OFFER, VENUE_COUNTER_QUOTE, type BookingRequestRow } from '../src/offers/queries';
import {
  SETTLED,
  failWith,
  flatQuote,
  makeCounter,
  makeOffer,
  makeRequest,
  mockOf,
  offerChanged,
  quote,
  quoteMin,
  withApollo,
  type Vars,
} from './offer-fixtures';

vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<object>()), notifySuccess: vi.fn(), notify: vi.fn() }));

interface QuoteAnswer {
  ok: boolean;
  message: string | null;
  quote: unknown;
  quote_min: unknown;
}
const quoted = (answer: QuoteAnswer) => () => ({
  data: { venueCounterQuote: { __typename: 'VenueOfferQuoteResult', ...answer } },
});
const quoteMock = (seen: Vars[] = [], answer: QuoteAnswer = { ok: true, message: null, quote: flatQuote, quote_min: flatQuote }) =>
  mockOf(VENUE_COUNTER_QUOTE, quoted(answer), seen);
const counterOk = (sent: Vars[]) =>
  mockOf(
    COUNTER_VENUE_OFFER,
    () => ({ data: { counterVenueOffer: { __typename: 'VenueBookingOffer', slot_id: 'slot-1', status: 'COUNTERED', round: 2 } } }),
    sent,
  );

const renderCard = (mocks: Parameters<typeof withApollo>[0], request: BookingRequestRow = makeRequest(), onDone = vi.fn()) => {
  withApollo(mocks, <OfferRequestCard request={request} onDone={onDone} />);
  return onDone;
};

const openCounter = () => {
  fireEvent.click(screen.getByTestId('offer-counter-slot-1'));
  return within(screen.getByRole('dialog'));
};

const pickModel = (form: ReturnType<typeof openCounter>, name: string) => {
  fireEvent.mouseDown(form.getByRole('combobox', { name: /Pricing option/ }));
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name }));
};

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notify).mockClear();
});

describe('countering', () => {
  it("starts from the host's terms with their minimum and points, and prices them for the booking", async () => {
    const seen: Vars[] = [];
    renderCard([quoteMock(seen)]);
    const form = openCounter();
    expect(form.getByText('Counter offer')).toBeInTheDocument();
    expect(form.getByLabelText('Amount (₹)')).toHaveValue(300);
    expect(form.getByLabelText('Fewest guests paid for')).toHaveValue(8);
    expect(form.getByText('The venue is paid for at least this many guests, even if fewer come. From 1 to 20.')).toBeInTheDocument();
    expect(form.getByLabelText('What the venue provides')).toHaveValue('10 chairs\nA projector');
    await waitFor(() => expect(seen).toContainEqual({ slot_id: 'slot-1', terms: { model: 'PER_GUEST', rate: 300, min_guests: 8 } }), SETTLED);
  });

  it('sends a flat counter with its points, note and round — and no minimum once the option is not per guest', async () => {
    const sent: Vars[] = [];
    const seen: Vars[] = [];
    const onDone = renderCard([counterOk(sent), quoteMock(seen)]);
    const form = openCounter();
    pickModel(form, 'Flat price');
    expect(form.queryByLabelText('Fewest guests paid for')).not.toBeInTheDocument();
    fireEvent.change(form.getByLabelText('Amount (₹)'), { target: { value: '7000' } });
    fireEvent.change(form.getByLabelText('What the venue provides'), { target: { value: '- A stage\n\nTwo mics' } });
    fireEvent.change(form.getByLabelText('Note to the host (optional)'), { target: { value: ' Weekend rate ' } });
    await waitFor(() => expect(seen).toContainEqual({ slot_id: 'slot-1', terms: { model: 'FLAT', rate: 7000 } }), SETTLED);
    expect(await within(screen.getByTestId('counter-offer-preview')).findByTestId('price-breakdown')).toBeInTheDocument();
    const money = within(within(screen.getByTestId('counter-offer-preview')).getByTestId('offer-money'));
    expect(money.getByText(/^You receive/)).toHaveTextContent('You receive ₹7,000');

    fireEvent.click(form.getByTestId('counter-offer-submit'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), SETTLED);
    expect(sent).toEqual([
      { slot_id: 'slot-1', terms: { model: 'FLAT', rate: 7000, offerings: ['A stage', 'Two mics'] }, note: 'Weekend rate', round: 1 },
    ]);
    expect(notifySuccess).toHaveBeenCalledWith('Your counter was sent to the host.');
  });

  it('never asks for a new price while only the points or the note are typed', async () => {
    const seen: Vars[] = [];
    renderCard([quoteMock(seen)]);
    const form = openCounter();
    await waitFor(() => expect(seen).toHaveLength(1), SETTLED);
    fireEvent.change(form.getByLabelText('What the venue provides'), { target: { value: 'A stage' } });
    fireEvent.change(form.getByLabelText('Note to the host (optional)'), { target: { value: 'Weekend' } });
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(seen).toHaveLength(1);
  });

  it('prices a new minimum and shows the money as a range with the breakdown at the most guests', async () => {
    const seen: Vars[] = [];
    renderCard([quoteMock(seen, { ok: true, message: null, quote, quote_min: quoteMin })]);
    const form = openCounter();
    fireEvent.change(form.getByLabelText('Fewest guests paid for'), { target: { value: '10' } });
    await waitFor(() => expect(seen).toContainEqual({ slot_id: 'slot-1', terms: { model: 'PER_GUEST', rate: 300, min_guests: 10 } }), SETTLED);
    const preview = within(screen.getByTestId('counter-offer-preview'));
    expect(within(await preview.findByTestId('offer-money')).getByText(/^You receive/)).toHaveTextContent('You receive ₹2,400 – ₹6,000');
    expect(preview.getByTestId('offer-breakdown-at')).toHaveTextContent('Breakdown at 20 guests');
  });

  it('refuses a minimum above the booking’s guests', async () => {
    const sent: Vars[] = [];
    renderCard([counterOk(sent), quoteMock()]);
    const form = openCounter();
    fireEvent.change(form.getByLabelText('Fewest guests paid for'), { target: { value: '21' } });
    fireEvent.click(form.getByTestId('counter-offer-submit'));
    expect(await form.findByText('Enter the fewest guests as a whole number from 1 to 20')).toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });

  it('sends no note when none is written, and starts from the current counter for its round', async () => {
    const sent: Vars[] = [];
    const offer = makeOffer({ status: 'COUNTERED', awaiting: 'HOST', round: 2, counter: makeCounter({ offerings: ['A stage'] }) });
    renderCard([counterOk(sent), quoteMock()], makeRequest({ offer }));
    const form = openCounter();
    expect(form.getByLabelText('Amount (₹)')).toHaveValue(7000);
    expect(form.queryByLabelText('Fewest guests paid for')).not.toBeInTheDocument();
    fireEvent.click(form.getByTestId('counter-offer-submit'));
    await waitFor(
      () => expect(sent).toEqual([{ slot_id: 'slot-1', terms: { model: 'FLAT', rate: 7000, offerings: ['A stage'] }, note: null, round: 2 }]),
      SETTLED,
    );
  });

  it('asks for a usable amount before pricing or sending', async () => {
    const sent: Vars[] = [];
    renderCard([counterOk(sent), quoteMock()]);
    const form = openCounter();
    fireEvent.change(form.getByLabelText('Amount (₹)'), { target: { value: '0' } });
    fireEvent.click(form.getByTestId('counter-offer-submit'));
    expect(await form.findByText('Enter an amount above 0')).toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });

  it('shows why the server cannot take the terms', async () => {
    renderCard([quoteMock([], { ok: false, message: 'This amount is too large', quote: null, quote_min: null })]);
    const form = openCounter();
    expect(await form.findByText('This amount is too large', {}, SETTLED)).toBeInTheDocument();
  });

  it('says so when the price cannot be fetched', async () => {
    renderCard([mockOf(VENUE_COUNTER_QUOTE, failWith('down'))]);
    const form = openCounter();
    expect(await form.findByText("We couldn't price these terms.", {}, SETTLED)).toBeInTheDocument();
  });

  it("keeps the dialog open with the server's reason when the counter is refused, and cancels cleanly", async () => {
    const onDone = renderCard([mockOf(COUNTER_VENUE_OFFER, failWith('This booking has already started')), quoteMock()]);
    const form = openCounter();
    fireEvent.click(form.getByTestId('counter-offer-submit'));
    expect(await form.findByText('This booking has already started', {}, SETTLED)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(form.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });

  it('says the terms changed and re-reads when the host moved before the counter went', async () => {
    const onDone = renderCard([mockOf(COUNTER_VENUE_OFFER, offerChanged()), quoteMock()]);
    const form = openCounter();
    fireEvent.click(form.getByTestId('counter-offer-submit'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), SETTLED);
    expect(notify).toHaveBeenCalledWith('The terms changed while you were reading them. Here are the latest.', 'warning');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });
});

describe('useCounterQuote', () => {
  it('asks the server nothing and shows no price while the counter is not valid yet', async () => {
    const seen: Vars[] = [];
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[mockOf(VENUE_COUNTER_QUOTE, () => ({ data: { venueCounterQuote: null } }), seen)]}>
        {children}
      </MockedProvider>
    );
    const { result } = renderHook(() => useCounterQuote(venueCounterQuoteSource('slot-1'), null), { wrapper });
    expect(result.current).toEqual({ result: null, loading: false, error: undefined });
    // Even after the debounce settles, no terms means no quote is requested.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(seen).toEqual([]);
    expect(result.current.result).toBeNull();
  });
});
