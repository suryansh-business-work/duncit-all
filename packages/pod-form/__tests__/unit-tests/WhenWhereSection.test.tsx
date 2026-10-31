import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import WhenWhereSection from '../../src/sections/WhenWhereSection';
import { PodFormDataProvider } from '../../src/context';
import { Harness, makeConfig, makeData, SLOT_LABELS } from './helpers';
import type { PodFormData, PodFormValues } from '../../src/types';

const useQueryMock = vi.fn();
vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({ label, slotProps }: any) => (
    <div>
      <span>picker:{label}</span>
      <span>helper:{slotProps?.textField?.helperText ?? ''}</span>
    </div>
  ),
}));

// The calendar itself is @duncit/slots' concern (tested there); this fake only
// shows what VenueOfferField hands it — one tile per pickable start — and
// reports a pick back the way the real one does (plus a pick of a tile it was
// never given, which the field must ignore).
vi.mock('@duncit/slots/mui', () => ({
  SlotCalendar: ({ slots, loading, selectedSlotId, onPick, labels, required }: any) => (
    <div data-testid="slot-calendar" data-selected={selectedSlotId} data-required={String(!!required)}>
      {loading && <span>{labels.loading}</span>}
      {slots.map((slot: any) => (
        <button key={slot.id} type="button" data-testid={`tile-${slot.id}`} disabled={!!slot.disabled} onClick={() => onPick(slot)}>
          {slot.start_at}
        </button>
      ))}
      <button type="button" onClick={() => onPick({ id: 'not-a-tile' })}>
        stray pick
      </button>
    </div>
  ),
}));

const VENUES = [
  { id: 'v1', venue_name: 'Alpha', locality: 'Bandra', city: 'Mumbai', lat: 19.1, lng: 72.8 },
  { id: 'v2', venue_name: 'Beta' },
];
const CLUBS = [{ id: 'c1' }];

const HALL_SLOT = {
  id: 's1',
  start_at: '2030-06-01T10:00:00.000Z',
  end_at: '2030-06-01T12:00:00.000Z',
  whole_day: false,
  notes: 'Hall',
  price: 250,
  space_label: 'Court 2',
  capacity: 12,
};

const slotsQuery = (venueAvailableSlots: unknown[], over: Partial<{ loading: boolean; error: Error }> = {}) => ({
  data: { venueAvailableSlots },
  loading: false,
  error: undefined,
  ...over,
});

/** The venue is open 10:00–12:00 UTC on 1 June 2030, and nothing is booked. */
const OPEN_DAY = {
  date: '2030-06-01',
  closed_reason: null,
  open: '2030-06-01T10:00:00.000Z',
  close: '2030-06-01T12:00:00.000Z',
  busy: [],
  slots: [],
};
const calendarQuery = (days: unknown[] = [OPEN_DAY], over: Partial<{ loading: boolean; error: Error; data: unknown }> = {}) => ({
  data: { venueOfferCalendar: { buffer_minutes: 0, min_notice_minutes: 0, days } },
  loading: false,
  error: undefined,
  ...over,
});
const quoteQuery = (venueOfferQuote: unknown) => ({ data: { venueOfferQuote }, loading: false, error: undefined });

const termsQuery = (publicVenue: unknown) => ({ data: { publicVenue }, loading: false, error: undefined });

/** Routes the form's four reads: the venue's offer bounds, the offer quote, the offer calendar, the venue's slots. */
function routeQueries({
  calendar = calendarQuery(),
  quote = quoteQuery(null),
  slots = slotsQuery([]),
  terms = termsQuery(null),
} = {}) {
  useQueryMock.mockImplementation((doc: unknown, options: { variables?: Record<string, unknown> }) => {
    if (String(doc).includes('PodFormVenueOfferTerms')) return terms;
    if (options?.variables && 'offer' in options.variables) return quote;
    if (options?.variables && 'to' in options.variables) return calendar;
    return slots;
  });
}

function renderWW(data: PodFormData, defaults: Partial<PodFormValues> = {}) {
  const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
  render(
    <Harness data={data} defaultValues={defaults} methodsRef={methodsRef}>
      <WhenWhereSection />
    </Harness>,
  );
  return methodsRef;
}

beforeEach(() => {
  useQueryMock.mockReset();
  useQueryMock.mockReturnValue(slotsQuery([]));
});

function NoDefaults({ data }: Readonly<{ data: PodFormData }>) {
  const methods = useForm<PodFormValues, any, PodFormValues>();
  return (
    <FormProvider {...methods}>
      <PodFormDataProvider value={data}>
        <WhenWhereSection />
      </PodFormDataProvider>
    </FormProvider>
  );
}

describe('WhenWhereSection (no form defaults)', () => {
  it('handles an undefined defaultValues object', () => {
    const data = makeData({ clubs: CLUBS, venues: VENUES, getClubVenueIds: () => ['v1', 'v2'] });
    render(<NoDefaults data={data} />);
    // with no club selected the venue field still prompts for a club
    expect(screen.getByText('Pick a club in Basic Information first.')).toBeInTheDocument();
  });
});

describe('WhenWhereSection (map + date mode)', () => {
  const data = makeData({
    clubs: CLUBS,
    venues: VENUES,
    getClubVenueIds: () => ['v1', 'v2'],
  });

  it('prompts to pick a club first when none is chosen', () => {
    renderWW(data);
    expect(screen.getByText('Pick a club in Basic Information first.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Venue/ })).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows the map preview and date pickers for the selected venue', () => {
    renderWW(data, { club_id: 'c1', venue_id: 'v1' });
    expect(screen.getByText('picker:Start date & time')).toBeInTheDocument();
    expect(screen.getByText('picker:End date & time')).toBeInTheDocument();
    // GoogleMapPreview uses the venue name as the section title
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('changes the venue without clearing dates when the slot picker is off', async () => {
    const user = userEvent.setup();
    const ref = renderWW(data, { club_id: 'c1' });
    await user.click(screen.getByLabelText(/Venue/));
    await user.click(await screen.findByRole('option', { name: 'Alpha - Bandra, Mumbai' }));
    expect(ref.current?.getValues('venue_id')).toBe('v1');
  });

  it('shows the empty-venue hint when the club has no linked venues', () => {
    const noVenues = makeData({ clubs: CLUBS, venues: VENUES, getClubVenueIds: () => [] });
    renderWW(noVenues, { club_id: 'c1' });
    expect(screen.getByText('No approved venues linked to this club.')).toBeInTheDocument();
  });

  it('shows the venue validation error message', () => {
    const ref = renderWW(data, { club_id: 'c1' });
    act(() => ref.current?.setError('venue_id', { type: 'custom', message: 'Select a venue' }));
    expect(screen.getByText('Select a venue')).toBeInTheDocument();
  });
});

describe('WhenWhereSection (venue-offer mode)', () => {
  const offerData = (over: Partial<PodFormData> = {}) =>
    makeData({
      clubs: CLUBS,
      venues: VENUES,
      getClubVenueIds: () => ['v1', 'v2'],
      config: makeConfig({ showVenueSlot: true }),
      ...over,
    });
  const at = (time: string) => `2030-06-01T${time}:00.000Z`;

  it('asks for a venue before offering any time', () => {
    routeQueries();
    renderWW(offerData(), { club_id: 'c1', venue_id: '' });
    expect(screen.getByText(SLOT_LABELS.pickVenueFirst)).toBeInTheDocument();
    expect(screen.queryByTestId('slot-calendar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pod-form-offer-terms')).not.toBeInTheDocument();
  });

  it('offers each half hour the venue is open, sets the window, and lets the end stretch to closing', async () => {
    const user = userEvent.setup();
    routeQueries();
    const ref = renderWW(offerData(), { club_id: 'c1', venue_id: 'v1' });
    expect(screen.getByTestId('slot-calendar')).toHaveAttribute('data-required', 'true');
    // 10:00, 10:30, 11:00 and 11:30 each leave half an hour before closing.
    expect(screen.getAllByRole('button', { name: /2030-06-01T/ })).toHaveLength(4);

    await user.click(screen.getByTestId(`tile-${at('10:00')}`));
    expect(ref.current?.getValues('pod_date_time')?.toISOString()).toBe(at('10:00'));
    // The shortest window is filled in at once.
    expect(ref.current?.getValues('pod_end_date_time')?.toISOString()).toBe(at('10:30'));
    expect(screen.getByText('Times the venue is free after your start')).toBeInTheDocument();

    await user.click(screen.getByLabelText('End time'));
    await user.click(await screen.findByRole('option', { name: '12:00' }));
    expect(ref.current?.getValues('pod_end_date_time')?.toISOString()).toBe(at('12:00'));
    expect(screen.getByTestId('slot-calendar')).toHaveAttribute('data-selected', at('10:00'));
  });

  it('ignores a pick of a time it never offered', async () => {
    const user = userEvent.setup();
    routeQueries();
    const ref = renderWW(offerData(), { club_id: 'c1', venue_id: 'v1' });
    await user.click(screen.getByRole('button', { name: 'stray pick' }));
    expect(ref.current?.getValues('pod_date_time')).toBeNull();
  });

  it('says no end fits when the start is outside what the venue offers', () => {
    routeQueries();
    renderWW(offerData(), {
      club_id: 'c1',
      venue_id: 'v1',
      pod_date_time: new Date('2030-07-01T10:00:00.000Z'),
      pod_end_date_time: new Date('2030-07-01T11:00:00.000Z'),
    });
    expect(screen.getByText('No end time fits after this start. Pick another start.')).toBeInTheDocument();
  });

  it('labels a day the venue closed itself and cannot be picked', () => {
    routeQueries({ calendar: calendarQuery([{ ...OPEN_DAY, closed_reason: 'HOLIDAY' }]) });
    renderWW(offerData(), { club_id: 'c1', venue_id: 'v1' });
    expect(screen.getByTestId('tile-closed|2030-06-01')).toBeDisabled();
  });

  it('shows the calendar loading only until its first answer', () => {
    routeQueries({ calendar: calendarQuery([], { loading: true, data: undefined }) });
    renderWW(offerData(), { club_id: 'c1', venue_id: 'v1' });
    expect(screen.getByText(SLOT_LABELS.loading)).toBeInTheDocument();
  });

  it('keeps showing the loaded days while the calendar refreshes', () => {
    routeQueries({ calendar: calendarQuery([OPEN_DAY], { loading: true }) });
    renderWW(offerData(), { club_id: 'c1', venue_id: 'v1' });
    expect(screen.queryByText(SLOT_LABELS.loading)).not.toBeInTheDocument();
  });

  it('shows the calendar error instead of the calendar', () => {
    routeQueries({ calendar: calendarQuery([], { error: new Error('Venue offline') }) });
    renderWW(offerData(), { club_id: 'c1', venue_id: 'v1' });
    expect(screen.getByText('Venue offline')).toBeInTheDocument();
    expect(screen.queryByTestId('slot-calendar')).not.toBeInTheDocument();
  });

  it('clears the dates when the venue changes', async () => {
    const user = userEvent.setup();
    routeQueries();
    const ref = renderWW(offerData(), {
      club_id: 'c1',
      venue_id: 'v1',
      pod_date_time: new Date(at('10:00')),
      pod_end_date_time: new Date(at('12:00')),
    });
    await user.click(screen.getByLabelText(/Venue/));
    await user.click(await screen.findByRole('option', { name: 'Beta' }));
    expect(ref.current?.getValues('venue_id')).toBe('v2');
    expect(ref.current?.getValues('pod_date_time')).toBeNull();
    expect(ref.current?.getValues('pod_end_date_time')).toBeNull();
  });

  it('shows the window validation error as an alert', () => {
    routeQueries();
    const ref = renderWW(offerData(), { club_id: 'c1', venue_id: 'v1' });
    act(() => ref.current?.setError('venue_slot_id', { type: 'custom', message: 'Pick an available slot' }));
    expect(screen.getByText('Pick an available slot')).toBeInTheDocument();
  });

  it('keeps an edited pod on the slot it holds until a new window is picked', async () => {
    const user = userEvent.setup();
    routeQueries();
    const ref = renderWW(offerData(), {
      club_id: 'c1',
      venue_id: 'v1',
      venue_slot_id: 'booked',
      pod_date_time: new Date(at('10:00')),
      pod_end_date_time: new Date(at('12:00')),
    });
    expect(screen.getByTestId('pod-form-held-slot')).toHaveTextContent(`${SLOT_LABELS.currentlyBooked}: 2030-06-01 10:00`);
    // No terms are asked for a booking that already stands.
    expect(screen.queryByTestId('pod-form-offer-terms')).not.toBeInTheDocument();
    expect(screen.getByTestId('slot-calendar')).toHaveAttribute('data-selected', '');

    await user.click(screen.getByTestId(`tile-${at('11:00')}`));
    expect(ref.current?.getValues('venue_slot_id')).toBe('');
    expect(screen.queryByTestId('pod-form-held-slot')).not.toBeInTheDocument();
    expect(screen.getByTestId('pod-form-offer-terms')).toBeInTheDocument();
  });
});

describe('WhenWhereSection (offer terms)', () => {
  const termsData = (finance?: PodFormData['finance']) =>
    makeData({
      clubs: CLUBS,
      venues: VENUES,
      getClubVenueIds: () => ['v1', 'v2'],
      config: makeConfig({ showVenueSlot: true }),
      finance,
    });
  const WINDOW = {
    club_id: 'c1',
    venue_id: 'v1',
    no_of_spots: 10,
    pod_date_time: new Date('2030-06-01T10:00:00.000Z'),
    pod_end_date_time: new Date('2030-06-01T12:00:00.000Z'),
  };
  const QUOTE = { model: 'PER_GUEST', rate: 300, pax: 10, hours: 2, base: 3000, rules: [], min_spend_top_up: 0, cleaning_fee: 0, pet_fee: 0, gst_pct: 18, taxes: 540, platform_fee_pct: 10, platform_fee: 354, venue_payout: 3540, total: 3894, deposit: 0 };

  it('asks how the venue is paid and how much, and prices nothing until both are set', async () => {
    const user = userEvent.setup();
    routeQueries({ quote: quoteQuery({ ok: true, message: null, quote: QUOTE }) });
    const ref = renderWW(termsData({ platform_fee_pct: 10, gst_pct: 18, currency_symbol: '₹' }), WINDOW);
    expect(screen.queryByTestId('pod-form-offer-total')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/How you pay the venue/));
    await user.click(await screen.findByRole('option', { name: 'Per guest' }));
    await user.type(screen.getByLabelText(/Amount you offer/), '300');
    expect(ref.current?.getValues('venue_offer_model')).toBe('PER_GUEST');
    expect(ref.current?.getValues('venue_offer_rate')).toBe('300');
    expect(await screen.findByTestId('pod-form-offer-total')).toHaveTextContent('₹3,894');
    // The amount is priced once typing settles: every quote asked for is the whole amount, never '3' or '30'.
    const quoteCalls = useQueryMock.mock.calls.filter(([, options]) => options?.variables?.offer && !options.skip);
    expect(quoteCalls.length).toBeGreaterThan(0);
    for (const [, options] of quoteCalls) {
      expect(options.variables.offer).toMatchObject({ model: 'PER_GUEST', rate: 300, pax: 10, space_label: '' });
    }
  });

  it('says why the venue cannot take the offer, with no currency set', () => {
    routeQueries({ quote: quoteQuery({ ok: false, message: 'The venue is closed then', quote: null }) });
    renderWW(termsData(), { ...WINDOW, venue_offer_model: 'FLAT', venue_offer_rate: '5000' });
    expect(screen.getByText('The venue is closed then')).toBeInTheDocument();
    expect(screen.queryByTestId('pod-form-offer-total')).not.toBeInTheDocument();
  });

  it('shows the terms errors on their fields', () => {
    routeQueries();
    const ref = renderWW(termsData(), WINDOW);
    act(() => {
      ref.current?.setError('venue_offer_model', { type: 'custom', message: 'Pick how you pay' });
      ref.current?.setError('venue_offer_rate', { type: 'custom', message: 'Enter an amount' });
    });
    expect(screen.getByText('Pick how you pay')).toBeInTheDocument();
    expect(screen.getByText('Enter an amount')).toBeInTheDocument();
  });

  it('asks for no price while the window is not picked yet', () => {
    routeQueries();
    renderWW(termsData(), { club_id: 'c1', venue_id: 'v1', venue_offer_model: 'FLAT', venue_offer_rate: '5000' });
    const asked = useQueryMock.mock.calls.filter(([, options]) => options?.variables && 'offer' in options.variables);
    expect(asked.every(([, options]) => options.skip)).toBe(true);
  });

  it('says how the picked option pays the venue — per guest is a minimum order value per person', () => {
    routeQueries();
    renderWW(termsData(), { ...WINDOW, venue_offer_model: 'PER_GUEST' });
    expect(screen.getByText(/A minimum order value per person/)).toBeInTheDocument();
    expect(screen.queryByText('Per guest, per hour, or one flat price')).not.toBeInTheDocument();
  });

  it('keeps the general hint until an option is picked', () => {
    routeQueries();
    renderWW(termsData(), WINDOW);
    expect(screen.getByText('Per guest, per hour, or one flat price')).toBeInTheDocument();
  });

  it('asks what the host needs from the venue (required) and an optional note — and never prices them', async () => {
    const user = userEvent.setup();
    routeQueries({ quote: quoteQuery({ ok: true, message: null, quote: QUOTE }) });
    const ref = renderWW(termsData(), { ...WINDOW, venue_offer_model: 'PER_GUEST', venue_offer_rate: '300' });
    const offerings = screen.getByRole('textbox', { name: /What you need from the venue/ });
    expect(offerings).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Request from the venue (optional)' })).not.toBeRequired();

    await user.type(offerings, 'A projector{enter}10 chairs');
    await user.type(screen.getByRole('textbox', { name: 'Request from the venue (optional)' }), 'We start at 7');
    expect(ref.current?.getValues('venue_offer_offerings')).toBe('A projector\n10 chairs');
    expect(ref.current?.getValues('venue_offer_note')).toBe('We start at 7');
    const offers = useQueryMock.mock.calls
      .filter(([, options]) => options?.variables?.offer)
      .map(([, options]) => options.variables.offer);
    expect(offers.length).toBeGreaterThan(0);
    for (const offer of offers) {
      expect(offer).not.toHaveProperty('offerings');
      expect(offer).not.toHaveProperty('note');
    }
  });

  it("names the venue's minimum guests when it has one", () => {
    routeQueries({ terms: termsQuery({ id: 'v1', capacity: 40, offer_min_guests: 8 }) });
    renderWW(termsData(), WINDOW);
    expect(screen.getByTestId('pod-form-venue-minimum')).toHaveTextContent('This venue takes bookings for at least 8 guests.');
  });

  it('says no minimum when the venue names none', () => {
    routeQueries({ terms: termsQuery({ id: 'v1', capacity: 40, offer_min_guests: 0 }) });
    renderWW(termsData(), WINDOW);
    expect(screen.queryByTestId('pod-form-venue-minimum')).not.toBeInTheDocument();
  });

  // What the venue hopes a booking brings is a guide beside the offer, never a rule.
  it('shows what the venue usually expects from a booking, in the pickers’ order, as a guide', () => {
    routeQueries({
      terms: termsQuery({
        id: 'v1',
        capacity: 40,
        offer_min_guests: 8,
        offer_min_business: [
          { model: 'FLAT', amount: 5000 },
          { model: 'PER_GUEST', amount: 200 },
          { model: 'PER_HOUR', amount: 0 },
        ],
      }),
    });
    renderWW(termsData({ platform_fee_pct: 10, gst_pct: 18, currency_symbol: '₹' }), WINDOW);
    expect(screen.getByTestId('pod-form-venue-min-business')).toHaveTextContent(
      /^Minimum business for this venue: ₹200\.00 per guest · ₹5,000\.00 per booking — Your offer must be at least the amount for the way you pay\.$/,
    );
  });

  it('reads the amounts without a symbol when no currency is set', () => {
    routeQueries({
      terms: termsQuery({ id: 'v1', capacity: 40, offer_min_guests: 0, offer_min_business: [{ model: 'PER_HOUR', amount: 400 }] }),
    });
    renderWW(termsData(), WINDOW);
    expect(screen.getByTestId('pod-form-venue-min-business')).toHaveTextContent(/^Minimum business for this venue: 400\.00 per hour — /);
  });

  // The minimum on the picked basis is a rule, not a guide: an amount below it
  // is flagged on the field (the server refuses it as BELOW_MIN_BUSINESS).
  const floorTerms = () =>
    termsQuery({ id: 'v1', capacity: 40, offer_min_guests: 0, offer_min_business: [{ model: 'PER_GUEST', amount: 200 }] });

  it('flags an amount below the minimum on the picked basis, on the amount field', () => {
    routeQueries({ terms: floorTerms() });
    renderWW(termsData(), { ...WINDOW, venue_offer_model: 'PER_GUEST', venue_offer_rate: '150' });
    expect(screen.getByLabelText(/Amount you offer/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('This venue takes at least 200.00 per guest — raise your offer to continue')).toBeInTheDocument();
  });

  it('takes an amount at the minimum, keeping the usual hint', () => {
    routeQueries({ terms: floorTerms() });
    renderWW(termsData(), { ...WINDOW, venue_offer_model: 'PER_GUEST', venue_offer_rate: '200' });
    expect(screen.getByLabelText(/Amount you offer/)).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByText("The venue's price rules, fees and GST are added on top, with Duncit's fee.")).toBeInTheDocument();
  });

  it('flags nothing before an amount is typed — the empty field keeps its own required rule', () => {
    routeQueries({ terms: floorTerms() });
    renderWW(termsData(), { ...WINDOW, venue_offer_model: 'PER_GUEST', venue_offer_rate: '' });
    expect(screen.getByLabelText(/Amount you offer/)).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByText(/raise your offer to continue/)).not.toBeInTheDocument();
  });

  it('says nothing of what the venue expects when it names no amount it can show', () => {
    routeQueries({
      terms: termsQuery({ id: 'v1', capacity: 40, offer_min_guests: 8, offer_min_business: [{ model: 'PER_GUEST', amount: 0 }] }),
    });
    renderWW(termsData(), WINDOW);
    expect(screen.getByTestId('pod-form-venue-minimum')).toBeInTheDocument();
    expect(screen.queryByTestId('pod-form-venue-min-business')).not.toBeInTheDocument();
  });

  it('offers the ways a venue can be paid — per guest, per hour or a flat price — then a free venue', async () => {
    const user = userEvent.setup();
    routeQueries();
    renderWW(termsData(), WINDOW);
    await user.click(screen.getByLabelText(/How you pay the venue/));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Per guest', 'Per hour', 'Flat price', 'Free venue']);
  });

  // A free venue is offered no amount; on a paid pod the host says here why it is free.
  it('asks a free venue on a paid pod no amount — why it is free and the free policy instead', () => {
    routeQueries();
    renderWW(termsData(), { ...WINDOW, pod_type: 'PAID', pod_amount: 300, venue_offer_model: 'FREE' });
    expect(screen.queryByLabelText(/Amount you offer/)).not.toBeInTheDocument();
    expect(screen.getByText(/The venue gives this time for free/)).toBeInTheDocument();
    expect(screen.getByTestId('pod-form-free-arrangement')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /Why is this free/ })).toBeInTheDocument();
  });

  it("leaves a free pod's free venue to the pod's own justification — never a second set", () => {
    routeQueries();
    renderWW(termsData(), { ...WINDOW, pod_type: 'FREE', venue_offer_model: 'FREE' });
    expect(screen.queryByLabelText(/Amount you offer/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('pod-form-free-arrangement')).not.toBeInTheDocument();
  });

  it("reads a per-guest offer as a range from the venue's minimum to the spots", () => {
    const quoteMin = { ...QUOTE, pax: 8, base: 2400, taxes: 432, platform_fee: 283.2, venue_payout: 2832, total: 3115.2 };
    routeQueries({ quote: quoteQuery({ ok: true, message: null, quote: QUOTE, quote_min: quoteMin }) });
    renderWW(termsData({ platform_fee_pct: 10, gst_pct: 18, currency_symbol: '₹' }), {
      ...WINDOW,
      venue_offer_model: 'PER_GUEST',
      venue_offer_rate: '300',
    });
    expect(screen.getByTestId('pod-form-offer-venue-range')).toHaveTextContent('₹2,832.00 – ₹3,540.00');
    expect(screen.getByTestId('pod-form-offer-total-range')).toHaveTextContent('₹3,115.20 – ₹3,894.00');
    expect(screen.getByText('From 8 guests, the fewest the venue is paid for, up to your 10 spots.')).toBeInTheDocument();
    expect(screen.queryByTestId('pod-form-offer-total')).not.toBeInTheDocument();
  });

  it('reads one total when both ends of the guests cost the same', () => {
    routeQueries({ quote: quoteQuery({ ok: true, message: null, quote: QUOTE, quote_min: { ...QUOTE, pax: 8 } }) });
    renderWW(termsData({ platform_fee_pct: 10, gst_pct: 18, currency_symbol: '₹' }), {
      ...WINDOW,
      venue_offer_model: 'FLAT',
      venue_offer_rate: '5000',
    });
    expect(screen.getByTestId('pod-form-offer-total')).toHaveTextContent('₹3,894');
    expect(screen.queryByTestId('pod-form-offer-range')).not.toBeInTheDocument();
  });
});

// A free pod collects nothing, so Duncit pays the venue nothing: on a slot the
// venue charges for, the author is told the host settles with the venue.
describe('WhenWhereSection (free pod on a priced slot)', () => {
  const noteData = (ownVenueIds?: string[]) =>
    makeData({
      clubs: CLUBS,
      venues: VENUES,
      getClubVenueIds: () => ['v1', 'v2'],
      config: makeConfig({ showVenueSlot: true }),
      ownVenueIds,
    });
  const NOTE = /Duncit will not pay the venue/;
  const HELD = { club_id: 'c1', venue_id: 'v1', venue_slot_id: 's1' };

  it('tells the author of a free pod to settle a priced slot with the venue directly', () => {
    routeQueries({ slots: slotsQuery([HALL_SLOT]) });
    renderWW(noteData(), { ...HELD, pod_type: 'FREE' });
    const note = screen.getByTestId('free-pod-venue-note');
    expect(note).toHaveAttribute('role', 'status');
    expect(note).toHaveTextContent(NOTE);
    expect(note).not.toHaveTextContent(/not to confirm the slot/);
  });

  it('says nothing for a free pod on a slot priced 0', () => {
    routeQueries({ slots: slotsQuery([{ ...HALL_SLOT, price: 0 }]) });
    renderWW(noteData(), { ...HELD, pod_type: 'FREE' });
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it('says nothing at the host’s own venue, whatever the slot costs', () => {
    routeQueries({ slots: slotsQuery([HALL_SLOT]) });
    renderWW(noteData(['v1']), { ...HELD, pod_type: 'FREE' });
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it('says nothing for a paid pod, which pays the venue on the platform', () => {
    routeQueries({ slots: slotsQuery([HALL_SLOT]) });
    renderWW(noteData(), { ...HELD, pod_type: 'PAID', pod_amount: 500 });
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it('reads a legacy free type as free', () => {
    routeQueries({ slots: slotsQuery([HALL_SLOT]) });
    renderWW(noteData(), { ...HELD, pod_type: 'NATIVE_FREE' });
    expect(screen.getByText(NOTE)).toBeInTheDocument();
  });
});
