/**
 * Step 4 — Offer for Venue (VenueOfferStep): the venue's minimum business at
 * the top, how the host pays, what they need from the venue (one point per
 * line) and a note, and the offer priced at both ends of the guests. Step 3's
 * picker (VenueOfferPicker) keeps only the guests and the window.
 *
 * Two rules matter most. The live quote is asked with everything that moves
 * the price and none of the ask, so typing the points never re-prices the
 * offer; and a per-guest offer reads as a range — from the venue's minimum to
 * the pod's spots — while any offer priced the same at both ends reads as one
 * amount.
 */
import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
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
import { blankCreatePodForm, type CreatePodFormValues, type CreatePodVenue } from '../../create-pod.types';
import { VENUE_OFFER_QUOTE } from '../../venueOffer';
import BookingGuestFields from '../BookingGuestFields';
import VenueOfferPicker from '../VenueOfferPicker';
import VenueOfferStep from '../VenueOfferStep';
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

const VENUES: CreatePodVenue[] = [
  {
    id: 'venue-1',
    venue_name: 'Indiranagar Courts',
    location_id: 'loc-1',
    // Stored in any order, with a basis left at 0 — the note reads it in the pickers' order, 0 left out.
    offer_min_business: [
      { model: 'PER_HOUR', amount: 400 },
      { model: 'FLAT', amount: 0 },
      { model: 'PER_GUEST', amount: 200 },
    ],
  },
  { id: 'venue-2', venue_name: 'Unpriced Hall', location_id: 'loc-1' },
];

const OFFER_VALUES: Partial<CreatePodFormValues> = {
  venue_id: 'venue-1',
  venue_space_label: 'Whole venue',
  pod_date_time: START,
  pod_end_date_time: END,
  no_of_spots: 20,
  venue_offer_model: 'PER_GUEST',
  venue_offer_rate: '300',
};

function useOfferForm(values?: Partial<CreatePodFormValues>) {
  return useForm<CreatePodFormValues, unknown, CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...OFFER_VALUES, ...values },
  });
}

function OfferStep({ values }: Readonly<{ values?: Partial<CreatePodFormValues> }>) {
  const form = useOfferForm(values);
  return <VenueOfferStep form={form} venues={VENUES} />;
}

function Picker({ minGuests }: Readonly<{ minGuests?: number }>) {
  const form = useOfferForm();
  return <VenueOfferPicker form={form} venueId="venue-1" spaceLabel="Whole venue" spots={SPOTS} minGuests={minGuests} />;
}

const withProviders = (mocks: MockedResponse[], ui: ReactElement) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>{ui}</LocalizationProvider>
      </ThemeProvider>
    </MockedProvider>,
  );

const renderStep = (mocks: MockedResponse[], props: Parameters<typeof OfferStep>[0] = {}) =>
  withProviders(mocks, <OfferStep {...props} />);

describe('VenueOfferStep — the ask', () => {
  it('asks what the host needs from the venue (required) and for an optional note', async () => {
    renderStep([]);
    await settle();

    expect(screen.getByTestId('create-pod-offer-step')).toBeInTheDocument();
    expect(screen.getByTestId('create-pod-offer-ask')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /What you need from the venue \*/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Request from the venue (optional)' })).toBeInTheDocument();
    expect(screen.getByText(fallbackT('availability.offers.ask.offeringsHint'))).toBeInTheDocument();
    expect(screen.getByText('Anything else the venue should know. Up to 1000 characters.')).toBeInTheDocument();
  });

  it('says how the picked pricing option pays the venue — per guest is a minimum order value per person', async () => {
    renderStep([]);
    await settle();

    expect(screen.getByText(fallbackT('mweb.createPod.offer.help.perGuest'))).toBeInTheDocument();
    expect(screen.queryByText(fallbackT('mweb.createPod.offer.modelHint'))).not.toBeInTheDocument();
  });

  it('keeps the general hint until an option is picked', async () => {
    renderStep([], { values: { venue_offer_model: '' } });
    await settle();

    expect(screen.getByText(fallbackT('mweb.createPod.offer.modelHint'))).toBeInTheDocument();
  });

  it('prices the offer without the points or the note, and typing them asks for no new price', async () => {
    const sent: Record<string, unknown>[] = [];
    renderStep([quoteMock(sent)]);
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

describe('VenueOfferStep — the price as a range', () => {
  it("reads what the venue receives and what the pod pays from the venue's minimum to the spots", async () => {
    renderStep([quoteMock([])]);
    await debounce();
    await settle();

    expect(screen.getByTestId('create-pod-quote-venue-range')).toHaveTextContent(`${money(2400)} – ${money(6000)}`);
    expect(screen.getByTestId('create-pod-quote-total-range')).toHaveTextContent(`${money(2640)} – ${money(6600)}`);
    expect(screen.getByText('From 8 guests, the fewest the venue is paid for, up to your 20 spots.')).toBeInTheDocument();
    // The breakdown below is the one at the most guests.
    expect(screen.getByText('Breakdown at 20 guests')).toBeInTheDocument();
    expect(screen.getByTestId('create-pod-venue-quote-total')).toHaveTextContent(money(6600));
  });

  it('reads one amount when the server prices no minimum below the spots', async () => {
    renderStep([quoteMock([], null)]);
    await debounce();
    await settle();

    expect(screen.getByTestId('create-pod-venue-quote-total')).toHaveTextContent(money(6600));
    expect(screen.queryByTestId('create-pod-quote-range')).not.toBeInTheDocument();
  });
});

// The venue's minimum business heads the offer step: an offer below the amount
// for the way the host pays cannot leave it (the schema) and the server refuses it.
describe('VenueOfferStep — the venue’s minimum business', () => {
  const NOTE = 'create-pod-venue-min-business';

  it('shows the picked venue’s amounts first, per guest before per hour, as the floor for the offer', async () => {
    renderStep([]);
    await settle();

    const note = screen.getByTestId(NOTE);
    expect(note).toHaveTextContent(fallbackT('availability.offers.minBusiness.createPodTitle'));
    expect([...note.querySelectorAll('li')].map((item) => item.textContent)).toEqual(['₹200.00 per guest', '₹400.00 per hour']);
    expect(note).toHaveTextContent(fallbackT('availability.offers.minBusiness.createPodHint'));
    expect(note).not.toHaveTextContent('per booking');
    // Above the offer itself, so the host reads the floor before typing an amount.
    expect(note.compareDocumentPosition(screen.getByTestId('create-pod-offer-ask')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('says nothing for a venue that named no amounts', async () => {
    renderStep([], { values: { venue_id: 'venue-2' } });
    await settle();

    expect(screen.queryByTestId(NOTE)).toBeNull();
    expect(screen.getByTestId('create-pod-offer-ask')).toBeInTheDocument();
  });
});

describe('VenueOfferPicker — guests and the window only', () => {
  it('keeps the intro and the guests, and leaves the offer terms, ask and quote to the offer step', async () => {
    withProviders([], <Picker minGuests={8} />);
    await settle();

    expect(screen.getByTestId('create-pod-offer-intro')).toBeInTheDocument();
    expect(screen.getByTestId('create-pod-venue-minimum')).toHaveTextContent(
      'This venue takes bookings for at least 8 guests.',
    );
    expect(screen.queryByTestId('create-pod-offer-ask')).not.toBeInTheDocument();
    expect(screen.queryByTestId('create-pod-venue-quote')).not.toBeInTheDocument();
    expect(screen.queryByText(fallbackT('mweb.createPod.offer.help.perGuest'))).not.toBeInTheDocument();
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
