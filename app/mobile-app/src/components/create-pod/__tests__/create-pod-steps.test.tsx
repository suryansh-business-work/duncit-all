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
import { usePotentialEarnings } from '@/hooks/usePotentialEarnings';
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
};
const freeSlot = {
  id: 's2',
  start_at: futureIso(48),
  end_at: futureIso(50),
  price: 0,
  space_label: '',
  capacity: 10,
  status: 'AVAILABLE',
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

function VenueSlotHarness({
  initial,
  venues = [venue],
  viewerUserId = 'me-1',
  clubVenueIds = new Set(venues.map((item) => item.id)),
}: Readonly<{
  initial: Partial<CreatePodFormValues>;
  venues?: CreatePodVenue[];
  viewerUserId?: string;
  clubVenueIds?: Set<string>;
}>) {
  const form = useForm<CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  return (
    <VenueSlotStep
      form={form}
      venues={venues}
      clubVenueIds={clubVenueIds}
      viewerUserId={viewerUserId}
    />
  );
}

/** Lets a test force a venue_space_label error to assert the danger-styled line. */
function SpaceErrorHarness() {
  const form = useForm<CreatePodFormValues>({
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
        viewerUserId="me-1"
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
  const form = useForm<CreatePodFormValues>({
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
        viewerUserId="other-user"
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

  it('filters slots to the picked space and coalesces a missing slot space label', async () => {
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
        initial={{ pod_mode: 'PHYSICAL', location_id: 'l1', venue_id: 'v1' }}
        venues={[withSpaces]}
      />,
    );
    fireEvent.press(screen.getByTestId('create-pod-space-Main Hall'));
    await screen.findByTestId('create-pod-slot-sa');
    expect(screen.queryByTestId('create-pod-slot-sb')).toBeNull();
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

  it('books a slot on your own venue with the instant-confirm note', async () => {
    renderWithProviders(
      <VenueSlotHarness initial={{ pod_mode: 'PHYSICAL', location_id: 'l1', venue_id: 'v1' }} />,
    );
    // Slots are gated behind the space (capacity) selection now.
    fireEvent.press(screen.getByTestId('create-pod-space-Whole venue'));
    await screen.findByTestId('create-pod-slot-s1');
    fireEvent.press(screen.getByTestId('create-pod-slot-s1'));
    expect(screen.getByTestId('create-pod-approval-note')).toHaveTextContent(/your venue/);
    // Free slots read as "Free" — the grid paginates by day, so switch to the
    // free slot's day first.
    const freeDay = format(new Date(freeSlot.start_at), 'yyyy-MM-dd');
    fireEvent.press(screen.getByTestId(`create-pod-day-${freeDay}`));
    expect(screen.getByTestId('create-pod-slot-s2')).toHaveTextContent(/Free/);
  });

  it('changing venue clears the previously booked slot', async () => {
    const second: CreatePodVenue = { ...venue, id: 'v2', venue_name: 'Terrace', locality: null };
    renderWithProviders(
      <VenueSlotHarness
        initial={{ pod_mode: 'PHYSICAL', location_id: 'l1', venue_id: 'v1', venue_slot_id: 's1' }}
        venues={[venue, second]}
      />,
    );
    // A slot is pre-booked → the approval note shows even before a space is picked.
    await screen.findByTestId('create-pod-approval-note');
    fireEvent.press(screen.getByTestId('create-pod-venue-v2'));
    await waitFor(() => expect(screen.queryByTestId('create-pod-approval-note')).toBeNull());
  });

  it('tells hosts the venue has no open slots', async () => {
    mockGraphqlRequest.mockResolvedValue({ venueAvailableSlots: [] });
    renderWithProviders(
      <VenueSlotHarness initial={{ pod_mode: 'PHYSICAL', location_id: 'l1', venue_id: 'v1' }} />,
    );
    fireEvent.press(screen.getByTestId('create-pod-space-Whole venue'));
    expect(await screen.findByTestId('create-pod-no-slots')).toBeOnTheScreen();
  });

  it('falls back to an empty slot list when the request fails', async () => {
    mockGraphqlRequest.mockRejectedValue(new Error('boom'));
    renderWithProviders(
      <VenueSlotHarness initial={{ pod_mode: 'PHYSICAL', location_id: 'l1', venue_id: 'v1' }} />,
    );
    fireEvent.press(screen.getByTestId('create-pod-space-Whole venue'));
    expect(await screen.findByTestId('create-pod-no-slots')).toBeOnTheScreen();
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
    const pad = (n: number) => String(n).padStart(2, '0');
    const toText = (date: Date) =>
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  const form = useForm<CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  const pricing = usePodPricing({
    podAmount: Number(form.watch('pod_amount_text')) || 0,
    noOfSpots: Number(form.watch('no_of_spots_text')) || 0,
    venueId: form.watch('venue_id') || null,
    slotPrice: slot.price,
    isPhysical: form.watch('pod_mode') === 'PHYSICAL',
  });
  return (
    <PricingStep
      form={form}
      products={[]}
      showProducts={false}
      finance={finance}
      pricing={pricing}
    />
  );
}

/** Renders the panel from the same hook the stepper uses, so the existing
 * `usePotentialEarnings` argument assertions still describe real behaviour. */
function PriceHarness({
  finance: financeSettings,
  ...input
}: Readonly<PodPricingInput & { finance: typeof finance }>) {
  return <PricePanel finance={financeSettings} pricing={usePodPricing(input)} />;
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
    expect(mockedEarnings).toHaveBeenCalledWith(0, 0, 'v1', 400);
  });
});

describe('SlotPicker', () => {
  it('shows the loading spinner and a validation error', () => {
    renderWithProviders(
      <SlotPicker slots={[]} loading selectedSlotId="" onPick={jest.fn()} error="Pick a slot" />,
    );
    expect(screen.getByTestId('create-pod-slots-loading')).toBeOnTheScreen();
    expect(screen.getByTestId('create-pod-slot-error')).toHaveTextContent('Pick a slot');
  });

  it('groups multiple slots on the same day under one heading', () => {
    const sameDay = [
      {
        id: 'a1',
        start_at: '2030-01-01T10:00:00.000Z',
        end_at: '2030-01-01T11:00:00.000Z',
        price: 100,
        space_label: '',
        capacity: 10,
        status: 'AVAILABLE',
      },
      {
        id: 'a2',
        start_at: '2030-01-01T12:00:00.000Z',
        end_at: '2030-01-01T13:00:00.000Z',
        price: 0,
        space_label: '',
        capacity: 10,
        status: 'AVAILABLE',
      },
    ];
    renderWithProviders(
      <SlotPicker slots={sameDay} loading={false} selectedSlotId="a1" onPick={jest.fn()} />,
    );
    expect(screen.getByTestId('create-pod-slot-a1')).toBeOnTheScreen();
    expect(screen.getByTestId('create-pod-slot-a2')).toHaveTextContent(/Free/);
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
  it('runs the waterfall on the full collection and groups charges under accordions', () => {
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
    expect(mockedEarnings).toHaveBeenCalledWith(1000, 30, 'v1', 300);
    // ₹X,XXX.XX everywhere — identical to the mWeb statement.
    expect(screen.getByText('Total collection (₹1,000.00 × 29)')).toBeOnTheScreen();
    expect(screen.getAllByText('₹29,000.00').length).toBeGreaterThanOrEqual(1);
    // The GST included in the collection is disclosed up front.
    expect(screen.getByTestId('price-panel-included-gst')).toHaveTextContent(
      'Includes GST ₹4,423.73 — prices are GST-inclusive',
    );
    // The main accordion carries the total deductions on its header.
    expect(screen.getByText('Govt. and other charges')).toBeOnTheScreen();
    expect(screen.getAllByText('₹8,257.29').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Total deductions')).toBeOnTheScreen();
    // Section headers show their subtotals without opening anything.
    expect(screen.getByText('Taxes')).toBeOnTheScreen();
    expect(screen.getByText('₹4,423.73')).toBeOnTheScreen();
    expect(screen.getByText('Platform Charges')).toBeOnTheScreen();
    expect(screen.getByText('₹1,228.81')).toBeOnTheScreen();
    expect(screen.getByText('Venue Charges')).toBeOnTheScreen();
    expect(screen.getByText('₹2,604.75')).toBeOnTheScreen();
    expect(screen.queryByTestId('price-panel-reconcile-warning')).toBeNull();
    // The payout card is the strongest element, with the Net Payout arithmetic.
    expect(screen.getByText('You will receive')).toBeOnTheScreen();
    expect(screen.getAllByText('₹20,742.71').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('price-panel-net-payout')).toBeOnTheScreen();
    expect(screen.getByText('= You will receive')).toBeOnTheScreen();
    expect(screen.getByText('− Total Deductions')).toBeOnTheScreen();
    expect(screen.getByText('For 29 paying pax')).toBeOnTheScreen();
    expect(screen.getByText('71.53% of collection')).toBeOnTheScreen();
    // The old commission naming is gone.
    expect(screen.queryByText(/Your Commission/)).toBeNull();
    expect(screen.queryByText(/per booking/)).toBeNull();
  });

  it('expands the charge groups to reveal their rows, and collapses the tree', () => {
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
    // Sections start collapsed; each row reveals its base, rate and formula.
    expect(screen.queryByText('GST @18%')).toBeNull();
    fireEvent.press(screen.getByTestId('price-panel-taxes-group'));
    expect(screen.getByText('Taxable Amount')).toBeOnTheScreen();
    expect(screen.getByText('₹24,576.27')).toBeOnTheScreen();
    expect(screen.getByText('GST @18%')).toBeOnTheScreen();
    expect(screen.getByText('Formula: ₹24,576.27 × 18%')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('price-panel-platform-group'));
    expect(screen.getByText('Platform Fee @5%')).toBeOnTheScreen();
    expect(screen.getByText('Formula: ₹24,576.27 × 5%')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('price-panel-venue-group'));
    expect(screen.getByText('Venue Slot Price')).toBeOnTheScreen();
    expect(screen.getByText('₹300.00')).toBeOnTheScreen();
    expect(
      screen.getByText('Formula: Fixed booked slot price (deducted once per pod)'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Duncit Commission from Venue @10%')).toBeOnTheScreen();
    expect(screen.getByText('Formula: ₹23,047.46 × 10% (your remainder)')).toBeOnTheScreen();
    // Pressing again closes the section.
    fireEvent.press(screen.getByTestId('price-panel-venue-group'));
    expect(screen.queryByText('Venue Slot Price')).toBeNull();
    // Collapsing the main accordion hides the sections; the payout stays.
    fireEvent.press(screen.getByTestId('price-panel-charges-header'));
    expect(screen.queryByText('Taxes')).toBeNull();
    expect(screen.getByText('You will receive')).toBeOnTheScreen();
  });

  it('shows the Club Charges section with the pool-based formula when a cut is configured', () => {
    const clubWaterfall = { ...waterfall, club_admin_pct: 10, club_admin_amount: 800.51 };
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
    fireEvent.press(screen.getByTestId('price-panel-club-group'));
    expect(screen.getByText('Club Admin Fee @10%')).toBeOnTheScreen();
    expect(screen.getAllByText('₹800.51').length).toBeGreaterThanOrEqual(2); // header + row
    expect(screen.getByText('Formula: ₹23,347.46 × 10%')).toBeOnTheScreen();
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
    expect(mockedEarnings).toHaveBeenCalledWith(100, 0, null, null);
    expect(
      screen.getByText('Set a ticket price and the number of spots to preview your earnings.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-earnings')).toBeNull();
  });

  it('skips venue rows for a virtual pod and asks without venue args', () => {
    const virtualWaterfall = {
      ...waterfall,
      venue_amount: 0,
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
    expect(mockedEarnings).toHaveBeenCalledWith(1000, 30, null, null);
    // No venue section; the Duncit commission joins Platform Charges instead.
    expect(screen.queryByText('Venue Charges')).toBeNull();
    fireEvent.press(screen.getByTestId('price-panel-platform-group'));
    expect(screen.getByText('Duncit Commission @10%')).toBeOnTheScreen();
    expect(screen.getAllByText('₹21,012.71').length).toBeGreaterThanOrEqual(1);
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
    expect(mockedEarnings).toHaveBeenCalledWith(100, 3, null, null);
  });
});
