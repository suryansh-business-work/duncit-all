import { useForm } from 'react-hook-form';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { VenueSlotStep } from '@/components/create-pod/steps/VenueSlotStep';
import { PricingStep } from '@/components/create-pod/steps/PricingStep';
import { SlotPicker } from '@/components/create-pod/SlotPicker';
import { VenueContactCard } from '@/components/create-pod/VenueContactCard';
import { PricePanel } from '@/components/create-pod/PricePanel';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
  type CreatePodVenue,
} from '@/components/create-pod/create-pod.types';
import { renderWithProviders } from '@/utils/test-utils';

const mockGraphqlRequest = jest.fn();
jest.mock('@/services/graphql.client', () => ({
  graphqlRequest: (...args: unknown[]) => mockGraphqlRequest(...args),
}));
jest.mock('@/hooks/useFeatureFlag', () => ({ useFeatureFlag: () => true }));

const futureIso = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
const slot = {
  id: 's1',
  start_at: futureIso(24),
  end_at: futureIso(26),
  price: 400,
  status: 'AVAILABLE',
};
const freeSlot = {
  id: 's2',
  start_at: futureIso(48),
  end_at: futureIso(50),
  price: 0,
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
});

function VenueSlotHarness({
  initial,
  venues = [venue],
  viewerUserId = 'me-1',
}: Readonly<{
  initial: Partial<CreatePodFormValues>;
  venues?: CreatePodVenue[];
  viewerUserId?: string;
}>) {
  const form = useForm<CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  return <VenueSlotStep form={form} venues={venues} viewerUserId={viewerUserId} />;
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
      <VenueSlotStep form={form} venues={venues} viewerUserId="other-user" />
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

  it('shows a manual-spots hint when the venue lists no capacity', () => {
    renderWithProviders(
      <VenueSlotHarness initial={{ pod_mode: 'PHYSICAL', location_id: 'l1', venue_id: 'v1' }} />,
    );
    expect(screen.getByTestId('create-pod-venue-capacity')).toHaveTextContent('Total capacity: 0');
    expect(screen.queryByTestId('create-pod-space-Whole venue')).toBeNull();
  });

  it('shows the empty hint when no venue partners serve the pod city', () => {
    renderWithProviders(<VenueSlotHarness initial={{ pod_mode: 'PHYSICAL', location_id: 'l9' }} />);
    expect(screen.getByTestId('create-pod-venue-empty')).toBeOnTheScreen();
  });

  it('books a slot on your own venue with the instant-confirm note', async () => {
    renderWithProviders(
      <VenueSlotHarness initial={{ pod_mode: 'PHYSICAL', location_id: 'l1', venue_id: 'v1' }} />,
    );
    await screen.findByTestId('create-pod-slot-s1');
    fireEvent.press(screen.getByTestId('create-pod-slot-s1'));
    expect(screen.getByTestId('create-pod-approval-note')).toHaveTextContent(/your venue/);
    // Free slots read as "Free" in the picker.
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
    await screen.findByTestId('create-pod-slot-s1');
    fireEvent.press(screen.getByTestId('create-pod-venue-v2'));
    await waitFor(() => expect(screen.queryByTestId('create-pod-approval-note')).toBeNull());
  });

  it('tells hosts the venue has no open slots', async () => {
    mockGraphqlRequest.mockResolvedValue({ venueAvailableSlots: [] });
    renderWithProviders(
      <VenueSlotHarness initial={{ pod_mode: 'PHYSICAL', location_id: 'l1', venue_id: 'v1' }} />,
    );
    await screen.findByTestId('create-pod-no-slots');
  });

  it('falls back to an empty slot list when the request fails', async () => {
    mockGraphqlRequest.mockRejectedValue(new Error('boom'));
    renderWithProviders(
      <VenueSlotHarness initial={{ pod_mode: 'PHYSICAL', location_id: 'l1', venue_id: 'v1' }} />,
    );
    await screen.findByTestId('create-pod-no-slots');
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

function PricingHarness({ initial }: Readonly<{ initial: Partial<CreatePodFormValues> }>) {
  const form = useForm<CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  return (
    <PricingStep
      form={form}
      products={[]}
      showProducts={false}
      selectedSlot={slot}
      finance={finance}
    />
  );
}

describe('PricingStep', () => {
  it('hides the products section when gated off and place charges for virtual pods', () => {
    renderWithProviders(<PricingHarness initial={{ pod_mode: 'VIRTUAL' }} />);
    expect(screen.queryByTestId('products-enabled-toggle')).toBeNull();
    expect(screen.queryByTestId('charge-add')).toBeNull();
    expect(screen.getByTestId('create-pod-price-panel')).toBeOnTheScreen();
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
        status: 'AVAILABLE',
      },
      {
        id: 'a2',
        start_at: '2030-01-01T12:00:00.000Z',
        end_at: '2030-01-01T13:00:00.000Z',
        price: 0,
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
  it('prompts for a slot before showing venue costs (physical)', () => {
    renderWithProviders(
      <PricePanel finance={finance} slotPrice={null} podAmount={100} spots={10} isPhysical />,
    );
    expect(screen.getByText('Pick a slot first')).toBeOnTheScreen();
  });

  it('computes slot GST + clamps negative potential earnings to zero', () => {
    renderWithProviders(
      <PricePanel finance={finance} slotPrice={1000} podAmount={0} spots={0} isPhysical />,
    );
    // GST 18% on ₹1000 = ₹180; no ticket revenue → potential clamps to 0.
    expect(screen.getByText('₹180')).toBeOnTheScreen();
    expect(screen.getByText('₹1180')).toBeOnTheScreen();
  });

  it('skips the venue-cost rows for virtual pods', () => {
    renderWithProviders(
      <PricePanel
        finance={finance}
        slotPrice={null}
        podAmount={100}
        spots={2}
        isPhysical={false}
      />,
    );
    expect(screen.queryByText('Venue slot price')).toBeNull();
    expect(screen.getByText('Potential earnings')).toBeOnTheScreen();
  });
});
