/**
 * Step 3's offer beside its price: what the host needs from the venue (one
 * point per line) and a note, the venue's minimum guests, and the offer priced
 * at both ends of the guests.
 *
 * Two rules matter most. The live quote is asked with everything that moves
 * the price and none of the ask, so typing the points never re-prices the
 * offer; and a per-guest offer reads as a range — from the venue's minimum to
 * the pod's spots — while any offer priced the same at both ends reads as one
 * amount.
 */
import '@testing-library/jest-dom/vitest';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { beforeAll, describe, expect, it } from 'vitest';
import { formatStatementMoney, type VenueQuote } from '@duncit/utils';

import { fallbackT } from '../../../../../i18n/fallback';
import { blankCreatePodForm, type CreatePodFormValues } from '../../create-pod.types';
import { VENUE_OFFER_QUOTE } from '../../venueOffer';
import BookingGuestFields from '../BookingGuestFields';
import VenueOfferPicker from '../VenueOfferPicker';
import VenueQuoteCard from '../VenueQuoteCard';

const theme = createTheme();
const money = (value: number) => formatStatementMoney(value, '₹');
const SPOTS = { min: 8, max: 40, slidable: true };
const START = new Date('2030-06-01T10:00:00.000Z');
const END = new Date('2030-06-01T12:00:00.000Z');

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};
/** Past the quote's 300 ms debounce. */
const debounce = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 350);
    });
  });
};

const quoteAt = (pax: number, payout: number, fee: number): VenueQuote => ({
  model: 'PER_GUEST',
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
  platform_fee_pct: 10,
  platform_fee: fee,
  venue_payout: payout,
  total: payout + fee,
  deposit: 0,
});
const AT_MOST = quoteAt(20, 6000, 600);
const AT_FEWEST = quoteAt(8, 2400, 240);

/** The price the quote must be asked with: the window, guests, pets, space and terms — no ask. */
const PRICE_OFFER = {
  start_at: START.toISOString(),
  end_at: END.toISOString(),
  space_label: '',
  pax: 20,
  pets: false,
  model: 'PER_GUEST',
  rate: 300,
};

function quoteMock(sent: Record<string, unknown>[], quoteMin: VenueQuote | null = AT_FEWEST): MockedResponse {
  return {
    request: {
      query: VENUE_OFFER_QUOTE,
      variables: (variables: Record<string, unknown>) => {
        sent.push(variables);
        return true;
      },
    },
    result: { data: { venueOfferQuote: { ok: true, message: null, quote: AT_MOST, quote_min: quoteMin } } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  };
}

function Picker({ values, minGuests }: Readonly<{ values?: Partial<CreatePodFormValues>; minGuests?: number }>) {
  const form = useForm<CreatePodFormValues, unknown, CreatePodFormValues>({
    defaultValues: {
      ...blankCreatePodForm,
      venue_id: 'venue-1',
      venue_space_label: 'Whole venue',
      pod_date_time: START,
      pod_end_date_time: END,
      no_of_spots: 20,
      venue_offer_model: 'PER_GUEST',
      venue_offer_rate: '300',
      ...values,
    },
  });
  return <VenueOfferPicker form={form} venueId="venue-1" spaceLabel="Whole venue" spots={SPOTS} minGuests={minGuests} />;
}

const renderPicker = (mocks: MockedResponse[], props: Parameters<typeof Picker>[0] = {}) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Picker {...props} />
        </LocalizationProvider>
      </ThemeProvider>
    </MockedProvider>,
  );

describe('VenueOfferPicker — the ask', () => {
  it('asks what the host needs from the venue (required) and for an optional note', async () => {
    renderPicker([]);
    await settle();

    expect(screen.getByTestId('create-pod-offer-ask')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /What you need from the venue \*/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Request from the venue (optional)' })).toBeInTheDocument();
    expect(screen.getByText(fallbackT('availability.offers.ask.offeringsHint'))).toBeInTheDocument();
    expect(screen.getByText('Anything else the venue should know. Up to 1000 characters.')).toBeInTheDocument();
  });

  it('says how the picked pricing option pays the venue — per guest is a minimum order value per person', async () => {
    renderPicker([]);
    await settle();

    expect(screen.getByText(fallbackT('mweb.createPod.offer.help.perGuest'))).toBeInTheDocument();
    expect(screen.queryByText(fallbackT('mweb.createPod.offer.modelHint'))).not.toBeInTheDocument();
  });

  it('keeps the general hint until an option is picked', async () => {
    renderPicker([], { values: { venue_offer_model: '' } });
    await settle();

    expect(screen.getByText(fallbackT('mweb.createPod.offer.modelHint'))).toBeInTheDocument();
  });

  it('prices the offer without the points or the note, and typing them asks for no new price', async () => {
    const sent: Record<string, unknown>[] = [];
    renderPicker([quoteMock(sent)]);
    await debounce();
    await settle();
    const asked = sent.length;
    expect(asked).toBeGreaterThan(0);
    expect(sent.at(-1)).toEqual({ venue_id: 'venue-1', offer: PRICE_OFFER });

    fireEvent.change(screen.getByRole('textbox', { name: /What you need from the venue/ }), {
      target: { value: 'A projector\n10 chairs' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Request from the venue (optional)' }), {
      target: { value: 'We start sharp at 7' },
    });
    await debounce();
    await settle();

    expect(sent).toHaveLength(asked);
    expect(screen.getByTestId('create-pod-venue-quote')).toBeInTheDocument();
  });
});

describe('VenueOfferPicker — the price as a range', () => {
  it("reads what the venue receives and what the pod pays from the venue's minimum to the spots", async () => {
    renderPicker([quoteMock([])], { minGuests: 8 });
    await debounce();
    await settle();

    expect(screen.getByTestId('create-pod-quote-venue-range')).toHaveTextContent(`${money(2400)} – ${money(6000)}`);
    expect(screen.getByTestId('create-pod-quote-total-range')).toHaveTextContent(`${money(2640)} – ${money(6600)}`);
    expect(screen.getByText('From 8 guests, the fewest the venue is paid for, up to your 20 spots.')).toBeInTheDocument();
    // The breakdown below is the one at the most guests.
    expect(screen.getByText('Breakdown at 20 guests')).toBeInTheDocument();
    expect(screen.getByTestId('create-pod-venue-quote-total')).toHaveTextContent(money(6600));
  });

  it('says the venue minimum under the spots', async () => {
    renderPicker([quoteMock([])], { minGuests: 8 });
    await settle();

    expect(screen.getByTestId('create-pod-venue-minimum')).toHaveTextContent(
      'This venue takes bookings for at least 8 guests.',
    );
  });

  it('reads one amount when the server prices no minimum below the spots', async () => {
    renderPicker([quoteMock([], null)]);
    await debounce();
    await settle();

    expect(screen.getByTestId('create-pod-venue-quote-total')).toHaveTextContent(money(6600));
    expect(screen.queryByTestId('create-pod-quote-range')).not.toBeInTheDocument();
  });
});

describe('VenueQuoteCard', () => {
  const card = (quoteMin: VenueQuote | null | undefined) =>
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
        <ThemeProvider theme={theme}>
          <VenueQuoteCard quote={AT_MOST} quoteMin={quoteMin} loading={false} error={null} />
        </ThemeProvider>
      </MockedProvider>,
    );

  it('reads a single amount when both ends are the same money (any option but per guest)', () => {
    card({ ...AT_MOST, pax: 8 });
    expect(screen.queryByTestId('create-pod-quote-range')).not.toBeInTheDocument();
    expect(screen.getByTestId('create-pod-venue-quote-total')).toHaveTextContent(money(6600));
  });

  it('reads a single amount when no minimum was priced at all', () => {
    card(undefined);
    expect(screen.queryByTestId('create-pod-quote-range')).not.toBeInTheDocument();
  });

  it('reads the range, fewest guests first, when the ends differ', () => {
    card(AT_FEWEST);
    expect(screen.getByTestId('create-pod-quote-venue-range')).toHaveTextContent(`${money(2400)} – ${money(6000)}`);
  });
});

describe('BookingGuestFields', () => {
  function Guests({ minGuests }: Readonly<{ minGuests?: number }>) {
    const form = useForm<CreatePodFormValues, unknown, CreatePodFormValues>({ defaultValues: blankCreatePodForm });
    return <BookingGuestFields form={form} spots={SPOTS} minGuests={minGuests} />;
  }

  it('says nothing about a minimum when the venue names none', () => {
    render(
      <ThemeProvider theme={theme}>
        <Guests />
      </ThemeProvider>,
    );
    expect(screen.queryByTestId('create-pod-venue-minimum')).not.toBeInTheDocument();
  });
});
