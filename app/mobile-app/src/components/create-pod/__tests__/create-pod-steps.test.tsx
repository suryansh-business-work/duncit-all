import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { VenueSlotStep } from '@/components/create-pod/steps/VenueSlotStep';
import { PricingStep } from '@/components/create-pod/steps/PricingStep';
import { SlotPicker } from '@/components/create-pod/SlotPicker';
import { VenueContactCard } from '@/components/create-pod/VenueContactCard';
import {
  PricePanel,
  usePodPricing,
  type PodPricingInput,
} from '@/components/create-pod/price-panel';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
  type CreatePodVenue,
} from '@/components/create-pod/create-pod.types';
import type { VenueQuoteState } from '@/components/create-pod/steps/VenueSlotStep/VenueQuoteCard';
import { VenuePricingModel } from '@/generated/graphql/graphql';
import { usePotentialEarnings } from '@/hooks/usePotentialEarnings';
import { startOfDayInZone } from '@duncit/utils';
import { appFormatter } from '@/utils/app-formatter';
import { renderWithProviders } from '@/utils/test-utils';

const mockedEarnings = usePotentialEarnings as jest.Mock;

// Canonical server waterfall @ GST 18 / fee 5 / commission 10, ₹1000, slot ₹300.
// The host's own spot is FREE, so a 30-spot pod bills 29 guests: ₹1000 × 29 =
// ₹29,000, with the venue's ₹300 slot price deducted ONCE (not per booking).
const waterfall = {
  amount: 29000,
  gst_pct: 18,
  gst_amount: 4423.73,
  net_amount: 24576.27,
  platform_fee_pct: 5,
  platform_fee_amount: 1228.81,
  pool_amount: 23347.46,
  club_admin_pct: 0,
  club_admin_amount: 0,
  venue_amount: 300,
  venue_commission_pct: 10,
  venue_commission_amount: 30,
  venue_receives: 270,
  host_amount: 23047.46,
  host_commission_pct: 10,
  host_commission_amount: 2304.75,
  host_receives: 20742.71,
  host_earn_pct: 71.53,
};

const projection = { total_spots: 30, payable_spots: 29, waterfall };

const mockGraphqlRequest = jest.fn();
jest.mock('@/services/graphql.client', () => ({
  graphqlRequest: (...args: unknown[]) => mockGraphqlRequest(...args),
}));
jest.mock('@/hooks/useFeatureFlag', () => ({ useFeatureFlag: () => true }));
jest.mock('@/hooks/usePotentialEarnings', () => ({ usePotentialEarnings: jest.fn() }));

const futureIso = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
const slot = {
  id: 's1',
  start_at: futureIso(24),
  end_at: futureIso(26),
  price: 400,
  space_label: '',
  capacity: 10,
  status: 'AVAILABLE',
  whole_day: false,
};
const freeSlot = {
  id: 's2',
  start_at: futureIso(48),
  end_at: futureIso(50),
  price: 0,
  space_label: '',
  capacity: 10,
  status: 'AVAILABLE',
  whole_day: false,
};
const finance = { platform_fee_pct: 5, gst_pct: 18, currency_symbol: '₹' };

const venue: CreatePodVenue = {
  id: 'v1',
  owner_user_id: 'me-1',
  venue_name: 'Hall',
  location_id: 'l1',
  city: 'Pune',
  locality: 'Camp',
  address_line1: 'St 1',
  state: 'MH',
  postal_code: '411001',
  country: 'IN',
  owner_name: 'Venue Owner',
  owner_phone: '+911234567890',
  owner_email: 'owner@venue.com',
};

beforeEach(() => {
  mockGraphqlRequest.mockReset();
  mockGraphqlRequest.mockResolvedValue({ venueAvailableSlots: [slot, freeSlot] });
  mockedEarnings
    .mockReset()
    .mockReturnValue({ projection: null, waterfall: null, isLoading: false });
});

const noQuote: VenueQuoteState = { quote: null, loading: false, error: null };

function VenueSlotHarness({
  initial,
  venues = [venue],
  clubVenueIds = new Set(venues.map((item) => item.id)),
  pinnedVenueId,
  venueQuote = noQuote,
}: Readonly<{
  initial: Partial<CreatePodFormValues>;
  venues?: CreatePodVenue[];
  clubVenueIds?: Set<string>;
  pinnedVenueId?: string;
  venueQuote?: VenueQuoteState;
}>) {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  return (
    <>
      <VenueSlotStep
        form={form}
        venues={venues}
        clubVenueIds={clubVenueIds}
        venueQuote={venueQuote}
        currencySymbol="₹"
        pinnedVenueId={pinnedVenueId}
        venueNotice="NONE"
      />
      <Text testID="readout-slot">{form.watch('venue_slot_id')}</Text>
      <Text testID="readout-start">{form.watch('pod_date_time_text')}</Text>
      <Text testID="readout-end">{form.watch('pod_end_date_time_text')}</Text>
    </>
  );
}

/** Routes the instant-booking reads by operation name; anything else (the app
 * settings the date formatter fetches) answers empty. */
function routeBookingReads(
  pricing: Record<string, unknown> | Error,
  calendar: Record<string, unknown> = { buffer_minutes: 0, min_notice_minutes: 0, days: [] },
) {
  mockGraphqlRequest.mockImplementation((doc: { definitions: { name?: { value: string } }[] }) => {
    const name = doc.definitions[0]?.name?.value;
    if (name === 'MobileHostBookingPricing') {
      return pricing instanceof Error ? Promise.reject(pricing) : Promise.resolve({ venuePricing: pricing });
    }
    if (name === 'MobileHostBookingCalendar') return Promise.resolve({ venueBookingCalendar: calendar });
    return Promise.resolve({});
  });
}

const HOUR_MS = 3_600_000;
const perHourPricing = {
  model: 'PER_HOUR',
  configured: true,
  min_pax: 0,
  max_pax: 0,
  min_hours: 1,
  max_hours: 0,
  booking_increment_minutes: 60,
  pet_fee: 0,
};
/** Two days out, open 10:00–13:00 in the admin zone. */
function openDay() {
  const fmt = appFormatter();
  const date = fmt.dayKey(futureIso(48));
  const midnight = startOfDayInZone(date, fmt.timeZone);
  const at = (hour: number) => new Date(midnight + hour * HOUR_MS).toISOString();
  return { date, at, open: at(10), close: at(13) };
}
const inputText = (iso: string) => format(new Date(iso), appFormatter().dateTimeInputFormat);
const instantVenue = {
  pod_mode: 'PHYSICAL' as const,
  location_id: 'l1',
  venue_id: 'v1',
  venue_space_label: 'Whole venue',
};

/** Lets a test force a venue_space_label error to assert the danger-styled line. */
function SpaceErrorHarness() {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    defaultValues: {
      ...blankCreatePodForm,
      pod_mode: 'PHYSICAL',
      location_id: 'l1',
      venue_id: 'v1',
    },
  });
  return (
    <>
      <VenueSlotStep
        form={form}
        venues={[venue]}
        clubVenueIds={new Set(['v1'])}
        venueQuote={{ quote: null, loading: false, error: null }}
        currencySymbol="₹"
        venueNotice="NONE"
      />
      <Text
        testID="force-space-error"
        role="button"
        aria-label="force"
        onPress={() =>
          form.setError('venue_space_label', {
            type: 'manual',
            message: 'Pick a space / capacity',
          })
        }
      />
    </>
  );
}

/** Exposes no_of_spots_text so space-picker auto-fill can be asserted. */
function SpaceHarness({ venues }: Readonly<{ venues: CreatePodVenue[] }>) {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    defaultValues: {
      ...blankCreatePodForm,
      pod_mode: 'PHYSICAL',
      location_id: 'l1',
      venue_id: venues[0]?.id ?? '',
    },
  });
  return (
    <>
      <VenueSlotStep
        form={form}
        venues={venues}
        clubVenueIds={new Set(venues.map((item) => item.id))}
        venueQuote={{ quote: null, loading: false, error: null }}
        currencySymbol="₹"
        venueNotice="NONE"
      />
      <Text testID="spots-readout">{form.watch('no_of_spots_text')}</Text>
    </>
  );
}

describe('VenueSlotStep', () => {
  it('lists named venue spaces and auto-fills spots from the picked capacity', async () => {
    const withSpaces: CreatePodVenue = {
      ...venue,
      venue_type: 'Banquet',
      capacity: 200,
      capacity_items: [
        { label: 'Main Hall', capacity: 120 },
        { label: 'Terrace', capacity: 40 },
      ],
    };
    renderWithProviders(<SpaceHarness venues={[withSpaces]} />);
    expect(screen.getByTestId('create-pod-venue-capacity')).toHaveTextContent(
      'Banquet · Total capacity: 200',
    );
    fireEvent.press(screen.getByTestId('create-pod-space-Terrace'));
    await waitFor(() => expect(screen.getByTestId('spots-readout')).toHaveTextContent('40'));
    // Switching to another space re-fills spots from its capacity.
    fireEvent.press(screen.getByTestId('create-pod-space-Main Hall'));
    await waitFor(() => expect(screen.getByTestId('spots-readout')).toHaveTextContent('120'));
  });

  it('offers the whole venue when only a total capacity is set', async () => {
    const totalOnly: CreatePodVenue = { ...venue, capacity: 75, capacity_items: [] };
    renderWithProviders(<SpaceHarness venues={[totalOnly]} />);
    fireEvent.press(screen.getByTestId('create-pod-space-Whole venue'));
    await waitFor(() => expect(screen.getByTestId('spots-readout')).toHaveTextContent('75'));
  });

  it('offers a "Whole venue" space (capacity 0) when the venue lists no capacity', () => {
    renderWithProviders(
      <VenueSlotHarness initial={{ pod_mode: 'PHYSICAL', location_id: 'l1', venue_id: 'v1' }} />,
    );
    expect(screen.getByTestId('create-pod-venue-capacity')).toHaveTextContent('Total capacity: 0');
    // No named capacity items → a single whole-venue chip (0 spots), not a manual hint.
    expect(screen.getByTestId('create-pod-space-Whole venue')).toHaveTextContent(/0 spots/);
  });

  it("filters a Pod Request's slots to the picked space and coalesces a missing slot space label", async () => {
    const withSpaces: CreatePodVenue = {
      ...venue,
      capacity: 200,
      capacity_items: [{ label: 'Main Hall', capacity: 120 }],
    };
    mockGraphqlRequest.mockResolvedValue({
      venueAvailableSlots: [
        { ...slot, id: 'sa', space_label: 'Main Hall' },
        // No space_label → coalesced to '' → excluded from the Main Hall list.
        {
          id: 'sb',
          start_at: futureIso(30),
          end_at: futureIso(32),
          price: 50,
          status: 'AVAILABLE',
        },
      ],
    });
    renderWithProviders(
      <VenueSlotHarness
        initial={{
          pod_mode: 'PHYSICAL',
          location_id: 'l1',
          venue_id: 'v1',
          partner_request_id: 'req1',
        }}
        venues={[withSpaces]}
      />,
    );
    fireEvent.press(screen.getByTestId('create-pod-space-Main Hall'));
    await screen.findByTestId('slot-tile-sa');
    expect(screen.queryByTestId('slot-tile-sb')).toBeNull();
  });

  it('surfaces the venue space validation error in danger styling', async () => {
    renderWithProviders(<SpaceErrorHarness />);
    fireEvent.press(screen.getByTestId('force-space-error'));
    expect(await screen.findByText('Pick a space / capacity')).toBeOnTheScreen();
  });

  it('shows the empty hint when the club matches no venue in the pod city', () => {
    renderWithProviders(<VenueSlotHarness initial={{ pod_mode: 'PHYSICAL', location_id: 'l9' }} />);
    expect(screen.getByTestId('create-pod-venue-empty')).toBeOnTheScreen();
  });

  it('shows the empty hint when the club has no matched venues (empty scope)', () => {
    renderWithProviders(
      <VenueSlotHarness
        initial={{ pod_mode: 'PHYSICAL', location_id: 'l1' }}
        clubVenueIds={new Set()}
      />,
    );
    expect(screen.getByTestId('create-pod-venue-empty')).toBeOnTheScreen();
  });

  it("keeps a Pod Request's venue on offer outside the club and city, asking for its held slot", async () => {
    const other: CreatePodVenue = { ...venue, id: 'v2', venue_name: 'Terrace', location_id: 'l7' };
    renderWithProviders(
      <VenueSlotHarness
        initial={{
          pod_mode: 'PHYSICAL',
          location_id: 'l1',
          venue_id: 'v2',
          partner_request_id: 'req1',
        }}
        venues={[venue, other]}
        clubVenueIds={new Set()}
        pinnedVenueId="v2"
      />,
    );
    expect(screen.getByTestId('create-pod-venue-v2')).toBeOnTheScreen();
    // The club matches nothing and v1 is not pinned, so only the request's venue shows.
    expect(screen.queryByTestId('create-pod-venue-v1')).toBeNull();
    expect(screen.queryByTestId('create-pod-venue-empty')).toBeNull();
    await waitFor(() =>
      expect(mockGraphqlRequest).toHaveBeenCalledWith(
        expect.anything(),
        { venue_id: 'v2', partner_request_id: 'req1' },
        { auth: true },
      ),
    );
  });

  it("books a Pod Request's held slot with no venue-approval note", async () => {
    const request = { pod_mode: 'PHYSICAL' as const, location_id: 'l1', venue_id: 'v1' };
    renderWithProviders(
      <VenueSlotHarness initial={{ ...request, partner_request_id: 'req1' }} />,
    );
    // Slots are gated behind the space (capacity) selection.
    fireEvent.press(screen.getByTestId('create-pod-space-Whole venue'));
    await screen.findByTestId('slot-tile-s1');
    fireEvent.press(screen.getByTestId('slot-tile-s1'));
    await waitFor(() => expect(screen.getByTestId('readout-slot')).toHaveTextContent('s1'));
    // Bookings are instant now — no "the venue must approve" line, and no
    // instant-booking picker for a pod that keeps its request's slot.
    expect(screen.queryByTestId('create-pod-approval-note')).toBeNull();
    expect(screen.queryByTestId('create-pod-instant-booking')).toBeNull();
    // Free slots read as "Free" — the calendar shows one day's times, so switch
    // to the free slot's day first (day keys follow the admin time zone, and the
    // grid pages by month when the two days straddle a month end).
    const freeDay = appFormatter().dayKey(freeSlot.start_at);
    if (!screen.queryByTestId(`slot-day-${freeDay}`)) {
      fireEvent.press(screen.getByTestId('slot-month-next'));
    }
    fireEvent.press(screen.getByTestId(`slot-day-${freeDay}`));
    expect(screen.getByTestId('slot-tile-s2')).toHaveTextContent(/Free/);
  });

  it('changing venue clears the previously booked slot and window', async () => {
    routeBookingReads({ ...perHourPricing, configured: false });
    const second: CreatePodVenue = { ...venue, id: 'v2', venue_name: 'Terrace', locality: null };
    const { at } = openDay();
    renderWithProviders(
      <VenueSlotHarness
        initial={{
          ...instantVenue,
          venue_slot_id: 's1',
          pod_date_time_text: inputText(at(10)),
          pod_end_date_time_text: inputText(at(12)),
        }}
        venues={[venue, second]}
      />,
    );
    expect(screen.getByTestId('readout-slot')).toHaveTextContent('s1');
    fireEvent.press(screen.getByTestId('create-pod-venue-v2'));
    await waitFor(() => expect(screen.getByTestId('readout-slot')).toHaveTextContent(/^$/));
    expect(screen.getByTestId('readout-start')).toHaveTextContent(/^$/);
    expect(screen.getByTestId('readout-end')).toHaveTextContent(/^$/);
  });

  it("tells hosts a Pod Request's venue has no open slots", async () => {
    mockGraphqlRequest.mockResolvedValue({ venueAvailableSlots: [] });
    renderWithProviders(
      <VenueSlotHarness
        initial={{ pod_mode: 'PHYSICAL', location_id: 'l1', venue_id: 'v1', partner_request_id: 'r1' }}
      />,
    );
    fireEvent.press(screen.getByTestId('create-pod-space-Whole venue'));
    expect(await screen.findByTestId('slot-calendar-empty')).toBeOnTheScreen();
  });

  it("falls back to an empty slot list when a Pod Request's slots fail to load", async () => {
    mockGraphqlRequest.mockRejectedValue(new Error('boom'));
    renderWithProviders(
      <VenueSlotHarness
        initial={{ pod_mode: 'PHYSICAL', location_id: 'l1', venue_id: 'v1', partner_request_id: 'r1' }}
      />,
    );
    fireEvent.press(screen.getByTestId('create-pod-space-Whole venue'));
    expect(await screen.findByTestId('slot-calendar-empty')).toBeOnTheScreen();
  });

  it('refuses to book a venue that has not set up its pricing', async () => {
    routeBookingReads({ ...perHourPricing, configured: false });
    renderWithProviders(<VenueSlotHarness initial={instantVenue} />);
    expect(await screen.findByTestId('create-pod-pricing-not-set')).toHaveTextContent(
      /has not set up its pricing/,
    );
    expect(screen.queryByTestId('slot-calendar')).toBeNull();
    // No slot list is asked for: instant booking reads the venue's own pricing.
    const askedForSlots = mockGraphqlRequest.mock.calls.some(([doc]) =>
      JSON.stringify(doc).includes('venueAvailableSlots'),
    );
    expect(askedForSlots).toBe(false);
  });

  it("says so when the venue's pricing fails to load", async () => {
    routeBookingReads(new Error('down'));
    renderWithProviders(<VenueSlotHarness initial={instantVenue} />);
    expect(await screen.findByTestId('create-pod-pricing-error')).toHaveTextContent(
      /Could not load this venue's pricing/,
    );
  });

  it('books a PER_HOUR window: a start, then an end on the venue grid', async () => {
    const { date, at, open, close } = openDay();
    routeBookingReads(perHourPricing, {
      buffer_minutes: 0,
      min_notice_minutes: 0,
      days: [{ date, closed_reason: null, open, close, busy: [], slots: [] }],
    });
    renderWithProviders(<VenueSlotHarness initial={instantVenue} />);
    expect(await screen.findByTestId('create-pod-booking-model')).toHaveTextContent(
      'Priced per hour',
    );
    // Starts every hour that still leaves one hour before closing: 10, 11, 12.
    await screen.findByTestId(`slot-tile-${at(10)}`);
    expect(screen.getByTestId(`slot-tile-${at(12)}`)).toBeOnTheScreen();
    expect(screen.queryByTestId(`slot-tile-${at(13)}`)).toBeNull();

    fireEvent.press(screen.getByTestId(`slot-tile-${at(10)}`));
    // The shortest window is filled in at once; the host can stretch it.
    await waitFor(() =>
      expect(screen.getByTestId('readout-end')).toHaveTextContent(inputText(at(11))),
    );
    expect(screen.getByTestId('readout-start')).toHaveTextContent(inputText(at(10)));
    expect(screen.getByTestId(`create-pod-booking-end-${at(13)}`)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(`create-pod-booking-end-${at(13)}`));
    await waitFor(() =>
      expect(screen.getByTestId('readout-end')).toHaveTextContent(inputText(at(13))),
    );
  });

  it('books a PER_SLOT venue by its free slot, which sets both ends of the window', async () => {
    const { date, at, open, close } = openDay();
    routeBookingReads(
      { ...perHourPricing, model: 'PER_SLOT' },
      {
        buffer_minutes: 0,
        min_notice_minutes: 0,
        days: [
          {
            date,
            closed_reason: null,
            open,
            close,
            busy: [],
            slots: [
              { start: at(10), end: at(11), price: 500, available: true },
              { start: at(11), end: at(12), price: 500, available: false },
            ],
          },
        ],
      },
    );
    renderWithProviders(<VenueSlotHarness initial={instantVenue} />);
    const free = `${at(10)}|${at(11)}`;
    await screen.findByTestId(`slot-tile-${free}`);
    // A taken slot is never offered.
    expect(screen.queryByTestId(`slot-tile-${at(11)}|${at(12)}`)).toBeNull();
    fireEvent.press(screen.getByTestId(`slot-tile-${free}`));
    await waitFor(() =>
      expect(screen.getByTestId('readout-end')).toHaveTextContent(inputText(at(11))),
    );
    expect(screen.getByTestId('readout-start')).toHaveTextContent(inputText(at(10)));
    expect(screen.getByTestId('readout-slot')).toHaveTextContent(/^$/);
    // A slot carries its own end, so no end-time picker is shown.
    expect(screen.queryByTestId('create-pod-booking-end')).toBeNull();
  });

  it("shows the server's quote for the picked window, read-only", async () => {
    routeBookingReads(perHourPricing);
    const quote: NonNullable<VenueQuoteState['quote']> = {
      model: VenuePricingModel.PerHour,
      rate: 500,
      pax: 0,
      hours: 2,
      base: 1000,
      rules: [],
      min_spend_top_up: 0,
      cleaning_fee: 0,
      pet_fee: 0,
      gst_pct: 18,
      taxes: 180,
      platform_fee_pct: 5,
      platform_fee: 59,
      venue_payout: 1180,
      total: 1239,
      deposit: 0,
    };
    renderWithProviders(
      <VenueSlotHarness
        initial={instantVenue}
        venueQuote={{ quote, loading: false, error: null }}
      />,
    );
    const card = await screen.findByTestId('create-pod-venue-quote');
    expect(card).toHaveTextContent(/Venue price/);
    expect(card).toHaveTextContent(/1,239/);
  });

  it('surfaces a failed quote instead of a price', async () => {
    routeBookingReads(perHourPricing);
    renderWithProviders(
      <VenueSlotHarness
        initial={instantVenue}
        venueQuote={{ quote: null, loading: false, error: new Error('Venue is closed then') }}
      />,
    );
    expect(await screen.findByTestId('create-pod-quote-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-venue-quote')).toBeNull();
  });

  it('renders meeting fields (and no slot picker) for virtual pods', () => {
    renderWithProviders(<VenueSlotHarness initial={{ pod_mode: 'VIRTUAL' }} />);
    expect(screen.getByTestId('field-meeting_url')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-venue-v1')).toBeNull();
    // No slot request goes out for virtual pods (other queries may run).
    const askedForSlots = mockGraphqlRequest.mock.calls.some(([doc]) =>
      JSON.stringify(doc).includes('venueAvailableSlots'),
    );
    expect(askedForSlots).toBe(false);
  });

  it('shows the live duration line for a scheduled virtual pod', () => {
    // Typed in the admin's input pattern — the same shape a picked slot writes.
    const toText = (date: Date) => format(date, appFormatter().dateTimeInputFormat);
    renderWithProviders(
      <VenueSlotHarness
        initial={{
          pod_mode: 'VIRTUAL',
          pod_date_time_text: toText(new Date(Date.now() + 24 * 3_600_000)),
          pod_end_date_time_text: toText(new Date(Date.now() + 26 * 3_600_000)),
        }}
      />,
    );
    expect(screen.getByTestId('pod-duration')).toBeOnTheScreen();
  });
});

// The stepper owns Step 4's money state (it gates Create Pod), so the harnesses
// derive it the same way the real container does.
function PricingHarness({ initial }: Readonly<{ initial: Partial<CreatePodFormValues> }>) {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  const pricing = usePodPricing({
    podAmount: Number(form.watch('pod_amount_text')) || 0,
    noOfSpots: Number(form.watch('no_of_spots_text')) || 0,
    venueId: form.watch('venue_id') || null,
    slotPrice: slot.price,
    isPhysical: form.watch('pod_mode') === 'PHYSICAL',
    isFree: form.watch('pod_type') === 'FREE',
  });
  return (
    <PricingStep
      form={form}
      products={[]}
      showProducts={false}
      finance={finance}
      pricing={pricing}
      spots={{ min: 0, max: 10000, slidable: false }}
      venueNotice="NONE"
    />
  );
}

/** Renders the panel from the same hook the stepper uses, so the existing
 * `usePotentialEarnings` argument assertions still describe real behaviour. */
function PriceHarness({
  finance: financeSettings,
  isFree = false,
  ...input
}: Readonly<Omit<PodPricingInput, 'isFree'> & { isFree?: boolean; finance: typeof finance }>) {
  return <PricePanel finance={financeSettings} pricing={usePodPricing({ ...input, isFree })} />;
}

describe('PricingStep', () => {
  it('hides the products section when gated off and place charges for virtual pods', () => {
    renderWithProviders(<PricingHarness initial={{ pod_mode: 'VIRTUAL' }} />);
    expect(screen.queryByTestId('products-enabled-toggle')).toBeNull();
    expect(screen.queryByTestId('charge-add')).toBeNull();
    expect(screen.getByTestId('create-pod-price-panel')).toBeOnTheScreen();
  });

  it('passes the picked venue + slot price to the earnings preview (physical)', () => {
    renderWithProviders(<PricingHarness initial={{ pod_mode: 'PHYSICAL', venue_id: 'v1' }} />);
    expect(mockedEarnings).toHaveBeenCalledWith(0, 0, 'v1', 400, null);
  });
});

describe('SlotPicker', () => {
  it('shows the loading spinner and a validation error', () => {
    const view = renderWithProviders(
      <SlotPicker slots={[]} loading selectedSlotId="" onPick={jest.fn()} error="Pick a slot" />,
    );
    expect(screen.getByTestId('slot-calendar-loading')).toBeOnTheScreen();
    // Once slots arrive the calendar replaces the spinner and carries the error.
    view.rerender(
      <SlotPicker
        slots={[slot]}
        loading={false}
        selectedSlotId=""
        onPick={jest.fn()}
        error="Pick a slot"
      />,
    );
    expect(screen.queryByTestId('slot-calendar-loading')).toBeNull();
    expect(screen.getByTestId('slot-calendar-error')).toHaveTextContent('Pick a slot');
  });

  it('groups multiple slots on the same day under one heading', () => {
    const sameDay = [
      {
        id: 'a1',
        start_at: '2030-01-01T10:00:00.000Z',
        end_at: '2030-01-01T11:00:00.000Z',
        whole_day: false,
        price: 100,
        space_label: '',
        capacity: 10,
        status: 'AVAILABLE',
      },
      {
        id: 'a2',
        start_at: '2030-01-01T12:00:00.000Z',
        end_at: '2030-01-01T13:00:00.000Z',
        whole_day: false,
        price: 0,
        space_label: '',
        capacity: 10,
        status: 'AVAILABLE',
      },
    ];
    renderWithProviders(
      <SlotPicker slots={sameDay} loading={false} selectedSlotId="a1" onPick={jest.fn()} />,
    );
    expect(screen.getByTestId('slot-tile-a1')).toBeOnTheScreen();
    expect(screen.getByTestId('slot-tile-a2')).toHaveTextContent(/Free/);
  });
});

describe('VenueContactCard', () => {
  it('falls back to the venue name without owner contact details', () => {
    renderWithProviders(<VenueContactCard venue={{ id: 'v3', venue_name: 'Bare Hall' }} />);
    expect(screen.getByTestId('create-pod-venue-contact')).toHaveTextContent(/Bare Hall/);
    expect(screen.queryByText('owner@venue.com')).toBeNull();
  });
});

describe('PricePanel', () => {
  it('runs the waterfall on the full collection and splits it four ways', () => {
    mockedEarnings.mockReturnValue({ projection, waterfall, isLoading: false });
    renderWithProviders(
      <PriceHarness
        finance={finance}
        slotPrice={300}
        venueId="v1"
        podAmount={1000}
        noOfSpots={30}
        isPhysical
      />,
    );
    // The query runs on the total collection (1000 × 30); the venue slot price
    // is passed once, not multiplied by the spot count.
    expect(mockedEarnings).toHaveBeenCalledWith(1000, 30, 'v1', 300, null);
    // ₹X,XXX.XX everywhere — identical to the mWeb statement.
    expect(screen.getByText('Total collection (₹1,000.00 × 29)')).toBeOnTheScreen();
    expect(screen.getByText('₹29,000.00')).toBeOnTheScreen();
    // The GST included in the collection is disclosed up front.
    expect(screen.getByTestId('price-panel-included-gst')).toHaveTextContent(
      'Includes GST ₹4,423.73 — prices are GST-inclusive',
    );
    expect(screen.getByText('Where the rest goes')).toBeOnTheScreen();
    // Venue keeps its ₹300 slot less Duncit's 10% (₹270); Duncit & Govt =
    // GST 4,423.73 + fee 1,228.81 + host commission 2,304.75 + venue commission 30.
    expect(screen.getByText('Venue Take')).toBeOnTheScreen();
    expect(screen.getByText('₹270.00')).toBeOnTheScreen();
    expect(screen.getByText('0.93% of collection')).toBeOnTheScreen();
    expect(screen.getByText('Club Admin Take')).toBeOnTheScreen();
    expect(screen.getByText('₹0.00')).toBeOnTheScreen();
    expect(screen.getByText('0% of collection')).toBeOnTheScreen();
    expect(screen.getByText('Duncit Commission & Govt Charges')).toBeOnTheScreen();
    expect(screen.getByText('₹7,987.29')).toBeOnTheScreen();
    expect(screen.getByText('27.54% of collection')).toBeOnTheScreen();
    expect(screen.getByText('Your Earning (Host)')).toBeOnTheScreen();
    expect(screen.getByText('₹20,742.71')).toBeOnTheScreen();
    expect(screen.getByText('71.53% of collection')).toBeOnTheScreen();
    expect(screen.queryByTestId('price-panel-reconcile-warning')).toBeNull();
    // The old charges tree and payout card are gone.
    expect(screen.queryByText('Govt. and other charges')).toBeNull();
    expect(screen.queryByText('Total deductions')).toBeNull();
  });

  it('starts every row collapsed and opens each breakdown on press', () => {
    mockedEarnings.mockReturnValue({ projection, waterfall, isLoading: false });
    renderWithProviders(
      <PriceHarness
        finance={finance}
        slotPrice={300}
        venueId="v1"
        podAmount={1000}
        noOfSpots={30}
        isPhysical
      />,
    );
    for (const key of ['venue', 'club', 'duncit', 'host']) {
      expect(screen.getByTestId(`price-panel-split-${key}`)).toHaveProp('aria-expanded', false);
    }
    expect(screen.queryByText('Commission from host @10%')).toBeNull();

    fireEvent.press(screen.getByTestId('price-panel-split-duncit'));
    expect(screen.getByTestId('price-panel-split-duncit')).toHaveProp('aria-expanded', true);
    expect(screen.getByText('Commission from host @10%')).toBeOnTheScreen();
    expect(screen.getByText('₹2,304.75')).toBeOnTheScreen();
    expect(screen.getByText('₹23,047.46 × 10%')).toBeOnTheScreen();
    expect(screen.getByText('Commission from venue @10%')).toBeOnTheScreen();
    expect(screen.getByText('GST @18% (paid to Govt.)')).toBeOnTheScreen();
    expect(screen.getByText('₹29,000.00 (total collection) × 18 ÷ 118')).toBeOnTheScreen();
    expect(screen.getByText('Platform fee @5%')).toBeOnTheScreen();
    expect(screen.getByText('₹24,576.27 × 5%')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('price-panel-split-venue'));
    expect(screen.getByText('Venue slot price')).toBeOnTheScreen();
    expect(screen.getByText('₹300.00')).toBeOnTheScreen();
    expect(screen.getByText('Less: Duncit commission from venue @10%')).toBeOnTheScreen();
    // The ₹30 venue commission appears under both Venue (less) and Duncit.
    expect(screen.getAllByText('₹30.00')).toHaveLength(2);

    fireEvent.press(screen.getByTestId('price-panel-split-host'));
    expect(screen.getByText('You will receive')).toBeOnTheScreen();
    expect(
      screen.getByText('₹29,000.00 − ₹270.00 venue − ₹0.00 club admin − ₹7,987.29 Duncit & Govt.'),
    ).toBeOnTheScreen();

    // Pressing again closes the row.
    fireEvent.press(screen.getByTestId('price-panel-split-duncit'));
    expect(screen.queryByText('Commission from host @10%')).toBeNull();
    expect(screen.getByTestId('price-panel-split-duncit')).toHaveProp('aria-expanded', false);
  });

  it('names every row for screen readers, host first', () => {
    mockedEarnings.mockReturnValue({ projection, waterfall, isLoading: false });
    renderWithProviders(
      <PriceHarness
        finance={finance}
        slotPrice={300}
        venueId="v1"
        podAmount={1000}
        noOfSpots={30}
        isPhysical
      />,
    );
    expect(screen.getByLabelText('Venue Take')).toHaveProp('role', 'button');
    expect(screen.getByLabelText('Club Admin Take')).toHaveProp('role', 'button');
    expect(screen.getByLabelText('Duncit Commission & Govt Charges')).toHaveProp('role', 'button');
    expect(screen.getByLabelText('Your Earning (Host)')).toHaveProp('role', 'button');
    // Read in order, the host's own earning comes before where the rest goes.
    const rows = [
      'Your Earning (Host)',
      'Venue Take',
      'Club Admin Take',
      'Duncit Commission & Govt Charges',
    ];
    const order = screen
      .getAllByRole('button')
      .map((node) => node.props['aria-label'])
      .filter((label) => rows.includes(label));
    expect(order).toEqual(rows);
  });

  it('shows the club admin take with its pool-based formula when a cut is configured', () => {
    // Club admin 3% of the ₹23,347.46 pool; the host side shrinks by it.
    const clubWaterfall = {
      ...waterfall,
      club_admin_pct: 3,
      club_admin_amount: 700.42,
      host_amount: 22347.04,
      host_commission_amount: 2234.7,
      host_receives: 20112.34,
      host_earn_pct: 69.35,
    };
    mockedEarnings.mockReturnValue({
      projection: { ...projection, waterfall: clubWaterfall },
      waterfall: clubWaterfall,
      isLoading: false,
    });
    renderWithProviders(
      <PriceHarness
        finance={finance}
        slotPrice={300}
        venueId="v1"
        podAmount={1000}
        noOfSpots={30}
        isPhysical
      />,
    );
    expect(screen.getByText('2.42% of collection')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('price-panel-split-club'));
    expect(screen.getByText('Club admin share @3%')).toBeOnTheScreen();
    expect(screen.getAllByText('₹700.42')).toHaveLength(2); // row header + breakdown
    expect(screen.getByText('₹23,347.46 (after GST & platform fee) × 3%')).toBeOnTheScreen();
    expect(screen.getByText('₹20,112.34')).toBeOnTheScreen();
    expect(screen.queryByTestId('price-panel-reconcile-warning')).toBeNull();
  });

  it('warns when the server figures do not add back to the collection', () => {
    // A club cut the payout was never reduced by — the four rows over-state.
    const drifted = { ...waterfall, club_admin_pct: 3, club_admin_amount: 700.42 };
    mockedEarnings.mockReturnValue({
      projection: { ...projection, waterfall: drifted },
      waterfall: drifted,
      isLoading: false,
    });
    renderWithProviders(
      <PriceHarness
        finance={finance}
        slotPrice={300}
        venueId="v1"
        podAmount={1000}
        noOfSpots={30}
        isPhysical
      />,
    );
    expect(screen.getByTestId('price-panel-reconcile-warning')).toHaveTextContent(
      'These figures do not reconcile — refresh, or contact support if this persists.',
    );
  });

  it('flags the venue row when the whole pod cannot cover the slot price', () => {
    mockedEarnings.mockReturnValue({ projection, waterfall, isLoading: false });
    renderWithProviders(
      <PriceHarness
        finance={finance}
        slotPrice={300}
        venueId="v1"
        podAmount={100}
        noOfSpots={3}
        isPhysical
      />,
    );
    // ₹100 × 2 payable spots = ₹200 < the ₹300 slot.
    expect(
      screen.getByText(/Your venue price is greater than the total Pod value/),
    ).toBeOnTheScreen();
  });

  it('explains that the host spot is free (remaining available slots)', () => {
    mockedEarnings.mockReturnValue({ projection, waterfall, isLoading: false });
    renderWithProviders(
      <PriceHarness
        finance={finance}
        slotPrice={300}
        venueId="v1"
        podAmount={1000}
        noOfSpots={30}
        isPhysical
      />,
    );
    expect(screen.getByTestId('price-panel-host-free-note')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Your spot is free — that is why the total calculation is based on the remaining available slots.',
      ),
    ).toBeOnTheScreen();
  });

  it('tells a 1-spot host there is nothing to bill (their seat is the free one)', () => {
    renderWithProviders(
      <PriceHarness
        finance={finance}
        slotPrice={null}
        venueId={null}
        podAmount={1000}
        noOfSpots={1}
        isPhysical={false}
      />,
    );
    expect(screen.getByTestId('price-panel-host-only')).toHaveTextContent(
      'This pod only has your own spot, which is free. Add more spots to earn.',
    );
    expect(screen.queryByTestId('create-pod-earnings')).toBeNull();
  });

  it('shows a hint until both a ticket price and spots are set', () => {
    renderWithProviders(
      <PriceHarness
        finance={finance}
        slotPrice={null}
        venueId={null}
        podAmount={100}
        noOfSpots={0}
        isPhysical={false}
      />,
    );
    expect(mockedEarnings).toHaveBeenCalledWith(100, 0, null, null, null);
    expect(
      screen.getByText('Set a ticket price and the number of spots to preview your earnings.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-earnings')).toBeNull();
  });

  it('skips venue rows for a virtual pod and asks without venue args', () => {
    const virtualWaterfall = {
      ...waterfall,
      venue_amount: 0,
      venue_commission_amount: 0,
      venue_receives: 0,
      host_amount: 23347.46,
      host_receives: 21012.71,
      host_earn_pct: 72.46,
    };
    mockedEarnings.mockReturnValue({
      projection: { ...projection, waterfall: virtualWaterfall },
      waterfall: virtualWaterfall,
      isLoading: false,
    });
    renderWithProviders(
      <PriceHarness
        finance={finance}
        slotPrice={null}
        venueId={null}
        podAmount={1000}
        noOfSpots={30}
        isPhysical={false}
      />,
    );
    expect(mockedEarnings).toHaveBeenCalledWith(1000, 30, null, null, null);
    // No venue money: the Venue Take reads ₹0 and Duncit's host commission
    // sits in the Duncit & Govt row.
    expect(screen.getByText('Venue Take')).toBeOnTheScreen();
    expect(screen.getAllByText('₹0.00')).toHaveLength(2); // venue + club
    fireEvent.press(screen.getByTestId('price-panel-split-duncit'));
    expect(screen.getByText('Commission from host @10%')).toBeOnTheScreen();
    expect(screen.getByText('₹21,012.71')).toBeOnTheScreen();
  });

  it('shows the earnings spinner while the preview loads', () => {
    mockedEarnings.mockReturnValue({ projection: null, waterfall: null, isLoading: true });
    renderWithProviders(
      <PriceHarness
        finance={finance}
        slotPrice={300}
        venueId="v1"
        podAmount={500}
        noOfSpots={10}
        isPhysical
      />,
    );
    expect(screen.getByTestId('create-pod-earnings-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-earnings')).toBeNull();
  });

  it('hides the previous (stale) waterfall while a new amount is loading', () => {
    // A refetch is in flight: the hook still holds the old waterfall but
    // isLoading is true — only the spinner may render, never stale money rows.
    mockedEarnings.mockReturnValue({ projection, waterfall, isLoading: true });
    renderWithProviders(
      <PriceHarness
        finance={finance}
        slotPrice={300}
        venueId="v1"
        podAmount={1000}
        noOfSpots={20}
        isPhysical
      />,
    );
    expect(screen.getByTestId('create-pod-earnings-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-earnings')).toBeNull();
  });

  it('asks without venue args until a slot is picked (physical)', () => {
    renderWithProviders(
      <PriceHarness
        finance={finance}
        slotPrice={null}
        venueId="v1"
        podAmount={100}
        noOfSpots={3}
        isPhysical
      />,
    );
    // Physical but no slot picked → no venue args, on the total collection.
    expect(mockedEarnings).toHaveBeenCalledWith(100, 3, null, null, null);
  });
});
