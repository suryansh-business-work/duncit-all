import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { format } from 'date-fns';

import { CreatePodStepper } from '@/components/create-pod/CreatePodStepper';
import { blankCreatePodForm } from '@/components/create-pod/create-pod.types';
import { renderWithProviders } from '@/utils/test-utils';

// Products are a flag-gated section inside the Pricing step; default the flag
// on so the end-to-end flows exercise it. The off path has its own test.
const mockFeatureFlag = jest.fn().mockReturnValue(true);
jest.mock('@/hooks/useFeatureFlag', () => ({
  useFeatureFlag: (key: string, fallback?: boolean) => mockFeatureFlag(key, fallback),
}));

// Venue slots load through the graphql client (useVenueSlots).
const mockGraphqlRequest = jest.fn();
jest.mock('@/services/graphql.client', () => ({
  graphqlRequest: (...args: unknown[]) => mockGraphqlRequest(...args),
}));

// The price panel's server-driven earnings preview has its own tests — keep
// the stepper flows deterministic (no debounce timers).
// It is a spy so a free pod can be shown to send it nothing to price.
const mockPotentialEarnings = jest.fn((..._args: unknown[]) => ({
  waterfall: null,
  isLoading: false,
}));
jest.mock('@/hooks/usePotentialEarnings', () => ({
  usePotentialEarnings: (...args: unknown[]) => mockPotentialEarnings(...args),
}));

// Cover media is upload-only now — stub the device pick so it delivers a hosted
// URL via onUploaded (into the picker's tray), satisfying the "at least one
// image" rule once the tray is committed.
jest.mock('@/hooks/useMediaUpload', () => ({
  useMediaUpload: (_folder: string, onUploaded: (url: string) => void) => ({
    uploading: false,
    error: undefined,
    pending: null,
    stage: 'processing' as const,
    progress: null,
    pick: jest.fn(async () => onUploaded('https://cdn/img.jpg')),
    confirm: jest.fn(),
    cancel: jest.fn(),
  }),
}));
jest.mock('@/hooks/useUploadSettings', () => ({ useUploadSettings: () => null }));

// The header LocationDialog is covered by its own spec (GPS/map). Stub it to a
// button that applies a configurable (location, zone) pick.
let mockLocationApply: [{ id: string }, string] = [{ id: 'l1' }, ''];
jest.mock('@/components/LocationDialog', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');
  return {
    LocationDialog: ({
      open,
      onApply,
      onClose,
    }: {
      open: boolean;
      onApply: (loc: { id: string }, zone: string) => void;
      onClose: () => void;
    }) =>
      open ? (
        <Pressable
          testID="mock-location-apply"
          onPress={() => {
            onApply(mockLocationApply[0], mockLocationApply[1]);
            onClose();
          }}
        >
          <Text>apply</Text>
        </Pressable>
      ) : null,
  };
});

// Venues are booked instantly at their own pricing: a PER_SLOT venue whose one
// free slot (on the hour, a day out) sets the pod's whole window when picked.
const HOUR_MS = 3_600_000;
const slotStartMs = Math.ceil((Date.now() + 24 * HOUR_MS) / HOUR_MS) * HOUR_MS;
const slot = {
  start_at: new Date(slotStartMs).toISOString(),
  end_at: new Date(slotStartMs + 2 * HOUR_MS).toISOString(),
};
// The venue is open exactly for that window: its first start tile is the
// window's start, and the window's end is offered after it.
const slotTile = `slot-tile-${slot.start_at}`;
const endChip = `create-pod-booking-end-${slot.end_at}`;
// What the server quotes for a flat ₹400 offer for the window: ₹400 + 18% GST to the venue,
// plus Duncit's fee on top.
const venuePriceQuote = {
  model: 'FLAT',
  rate: 400,
  pax: 0,
  hours: 2,
  base: 400,
  rules: [],
  min_spend_top_up: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  gst_pct: 18,
  taxes: 72,
  platform_fee_pct: 5,
  platform_fee: 24,
  venue_payout: 472,
  total: 496,
  deposit: 0,
};

function routeRequests(doc: { definitions: { name?: { value: string } }[] }) {
  switch (doc.definitions[0]?.name?.value) {
    case 'MobileVenueOfferCalendar':
      return Promise.resolve({
        venueOfferCalendar: {
          buffer_minutes: 0,
          min_notice_minutes: 0,
          days: [
            {
              date: slot.start_at.slice(0, 10),
              closed_reason: null,
              open: slot.start_at,
              close: slot.end_at,
              busy: [],
              slots: [],
            },
          ],
        },
      });
    case 'MobileVenueOfferQuote':
      return Promise.resolve({
        venueOfferQuote: { ok: true, message: null, quote: venuePriceQuote },
      });
    default:
      return Promise.resolve({});
  }
}

beforeEach(() => {
  mockFeatureFlag.mockReturnValue(true);
  mockGraphqlRequest.mockReset();
  mockGraphqlRequest.mockImplementation(routeRequests);
});

const clubs = [
  // Same city (l1) + the host's super category → shown. Carries the auto-matched
  // venues that scope the venue picker on step 3 (v9 is dropped by the city filter).
  {
    id: 'c1',
    club_name: 'Runners',
    location_id: 'l1',
    super_category_id: 'sc-sports',
    category_id: 'sub-trail',
    matched_venues: [{ id: 'v1' }, { id: 'v9' }],
    matched_venues_count: 1,
  },
  { id: 'c2', club_name: 'Writers', location_id: 'l1', super_category_id: 'sc-sports' },
  // Right category, different city → dropped for an l1 physical pod.
  { id: 'c3', club_name: 'Surfers', location_id: 'l2', super_category_id: 'sc-sports' },
  // Different category → dropped regardless of city.
  { id: 'c4', club_name: 'Gamers', location_id: 'l1', super_category_id: 'sc-games' },
  // No category at all → dropped while the host has categories.
  { id: 'c5', club_name: 'Nomads', location_id: 'l1' },
];
const locations = [
  { id: 'l1', location_name: 'Pune', city: 'Pune', state: 'MH' },
  { id: 'l2', location_name: 'Mumbai', city: 'Mumbai', state: 'MH' },
];
const venues = [
  {
    id: 'v1',
    owner_user_id: 'owner-1',
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
  },
  { id: 'v9', owner_user_id: 'owner-9', venue_name: 'Far Hall', location_id: 'l9' },
];
const products = [{ id: 'p1', product_name: 'Water', unit_cost: 20, available_count: 10 }];
const hostCategories = [
  {
    super_category_id: 'sc-sports',
    super_category_name: 'Sports',
    category_name: 'Running',
    sub_category_name: 'Trail',
  },
];
const finance = { platform_fee_pct: 5, gst_pct: 18, currency_symbol: '₹' };

const initialValues = { ...blankCreatePodForm, location_id: 'l1' };

const setup = (over: Record<string, unknown> = {}) => {
  const onSaveDraft = jest.fn().mockResolvedValue('draft-1');
  const onPublish = jest.fn().mockResolvedValue(undefined);
  const onModerate = jest.fn().mockResolvedValue({ allowed: true, violations: [] });
  renderWithProviders(
    <CreatePodStepper
      initialValues={initialValues}
      initialStep={0}
      initialDraftId={null}
      clubs={clubs}
      locations={locations}
      venues={venues}
      products={products}
      subCategories={[{ id: 'sub-trail', min_pax: 4 }]}
      hostCategories={hostCategories}
      viewerUserId="me-1"
      finance={finance}
      onSaveDraft={onSaveDraft}
      onModerate={onModerate}
      onPublish={onPublish}
      {...over}
    />,
  );
  return { onSaveDraft, onModerate, onPublish };
};

const press = (testID: string) => fireEvent.press(screen.getByTestId(testID));

// The schedule boxes speak the admin's typed pattern; with no settings loaded
// that is the keyboard form of 'dd MMM yyyy' plus 'hh:mm a'.
const typedAt = (hours: number) =>
  format(new Date(Date.now() + hours * 3_600_000), 'dd MM yyyy hh:mm a');

// Step 1 (Location, Category & Club): the sole host category is auto-selected,
// so picking the mode and a club is all that is left.
async function pickClub(mode: 'PHYSICAL' | 'VIRTUAL' = 'PHYSICAL') {
  await screen.findByTestId('create-pod-club-c1');
  if (mode === 'VIRTUAL') press('create-pod-mode-VIRTUAL');
  press('create-pod-club-c1');
  press('create-pod-submit');
}

// Fills step 2 (Basics) with valid values.
async function fillBasics() {
  await screen.findByTestId('field-pod_title');
  fireEvent.changeText(screen.getByTestId('field-pod_title'), 'Sunday community hike');
  fireEvent.changeText(
    screen.getByTestId('field-pod_description'),
    'A relaxed group hike around the lake.',
  );
  // Cover media is upload-only: the picker's phone tab hands off to the stubbed
  // device pick, which lands in the tray until "Use this image" commits it.
  press('media-upload-add');
  press('cover-device-add');
  await screen.findByTestId('cover-tray-remove-0');
  press('cover-picker-done');
  await screen.findByTestId('media-thumb-https://cdn/img.jpg');
  // "What this pod offers" is required.
  fireEvent.changeText(screen.getByTestId('create-pod-offers-input'), 'Guided trail');
  fireEvent(screen.getByTestId('create-pod-offers-input'), 'submitEditing');
  await screen.findByTestId('create-pod-offers-chip-Guided trail');
}

// Step 3 for a physical pod: venue → space (capacity) → a start and an end
// the venue is open for.
async function pickWindow() {
  await screen.findByTestId('create-pod-venue-v1');
  press('create-pod-venue-v1');
  // The space (capacity) selector gates the booking calendar — pick the whole venue.
  press('create-pod-space-Whole venue');
  await screen.findByTestId(slotTile);
  press(slotTile);
  await screen.findByTestId(endChip);
  press(endChip);
}

// Step 4 (Offer for Venue): how the host pays it, then the server's quote.
async function offerFlat() {
  await screen.findByTestId('create-pod-offer-step');
  press('create-pod-offer-model-FLAT');
  fireEvent.changeText(screen.getByTestId('field-venue_offer_rate'), '400');
  // What the host needs from the venue is required beside the price.
  fireEvent.changeText(screen.getByTestId('field-venue_offer_offerings'), 'A projector');
  await screen.findByTestId('create-pod-venue-quote');
}

// Drives the flow up to the Pricing step for either mode.
async function fillToPricing(mode: 'PHYSICAL' | 'VIRTUAL') {
  await pickClub(mode);
  await fillBasics();
  press('create-pod-submit');
  if (mode === 'PHYSICAL') {
    await pickWindow();
    press('create-pod-submit');
    await offerFlat();
  } else {
    await screen.findByTestId('field-meeting_url');
    // The platform is picked from the shared list, and a virtual pod has no
    // slot to close it, so it carries its own end.
    press('meeting_platform-GOOGLE_MEET');
    fireEvent.changeText(screen.getByTestId('field-meeting_url'), 'https://meet.duncit.com/x');
    fireEvent.changeText(screen.getByTestId('field-pod_date_time_text'), typedAt(24));
    fireEvent.changeText(screen.getByTestId('field-pod_end_date_time_text'), typedAt(26));
  }
  press('create-pod-submit');
  // Both cards are offered for either mode; a new pod starts on Paid.
  await screen.findByTestId('create-pod-paid');
  // The Ticket Price field ships blank and gates Create Pod, so a paid pod is
  // only publishable once the host types a price.
  fireEvent.changeText(screen.getByTestId('field-pod_amount_text'), '500');
  // Accept the Organizer Terms gate so the final publish validates.
  press('create-pod-terms');
}

// Says why the pod (or the venue) is free and accepts Duncit's free policy.
function justifyFree(prefix: string) {
  press(`${prefix}-free-reason-PROMOTIONAL`);
  press(`${prefix}-free-accept`);
}

// A physical pod that offers its venue walks five steps; a virtual pod skips
// the offer step and walks four.
const expectStep = (step: number, total = 5) =>
  expect(screen.getByTestId('create-pod-progress')).toHaveProp(
    'aria-label',
    `Step ${step} of ${total}`,
  );

describe('CreatePodStepper', () => {
  it('walks a physical pod end to end: slot booking sets the window, then publishes', async () => {
    const { onPublish } = setup();
    expectStep(1);
    expect(screen.getByTestId('create-pod-step-title')).toHaveTextContent(
      'Location, Category & Club',
    );

    // Step 1: the sole host category is auto-selected and scopes the club list
    // together with the pod city: c1 & c2 (l1 + Sports) stay; c3 (other city),
    // c4 (other category) and c5 (no category) all drop out.
    expect(screen.getByTestId('create-pod-category-sc-sports|')).toHaveProp('aria-checked', true);
    expect(screen.getByTestId('create-pod-club-c1-place')).toHaveTextContent(/Pune/);
    expect(screen.getByTestId('create-pod-club-c2')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-club-c3')).toBeNull();
    expect(screen.queryByTestId('create-pod-club-c4')).toBeNull();
    expect(screen.queryByTestId('create-pod-club-c5')).toBeNull();
    press('create-pod-club-c1');
    expect(screen.getByTestId('club-preview')).toBeOnTheScreen();
    press('create-pod-submit');

    // Step 2: basics.
    await fillBasics();
    expectStep(2);
    press('create-pod-submit');

    // Step 3: only the club's matched venues in the pod city are offered; the
    // space (capacity) selector gates the slots, and picking a slot books it.
    await screen.findByTestId('create-pod-venue-v1');
    expect(screen.queryByTestId('create-pod-venue-v9')).toBeNull();
    await pickWindow();
    expectStep(3);
    // The window offered to the venue, the contact card and the duration; how
    // the host pays the venue is the next step's.
    expect(screen.getByTestId('create-pod-offer-intro')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-offer-terms')).toBeNull();
    // A paid pod pays the venue through Duncit — no settle-it-yourself note.
    expect(screen.queryByTestId('create-pod-free-venue-note')).toBeNull();
    expect(screen.getByTestId('create-pod-venue-contact')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-duration')).toBeOnTheScreen();
    // Back returns to the basics step, then forward again keeps the booking.
    press('create-pod-back');
    await screen.findByTestId('field-pod_title');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-venue-v1');
    expect(await screen.findByTestId(slotTile)).toHaveProp('aria-pressed', true);
    press('create-pod-submit');

    // Step 4: the offer for the venue and the server's quote for it. The venue
    // answers it once the pod is sent.
    await offerFlat();
    expectStep(4);
    expect(screen.getByTestId('create-pod-step-title')).toHaveTextContent('Offer for Venue');
    expect(screen.getByTestId('create-pod-venue-quote')).toHaveTextContent(/496/);
    press('create-pod-submit');

    // Step 5: pricing + products + price panel. Both cards are offered to a
    // physical pod and Paid is preselected, with its full calculation.
    await screen.findByTestId('create-pod-paid');
    expectStep(5);
    expect(screen.getByTestId('create-pod-free')).toHaveProp('aria-checked', false);
    expect(screen.getByTestId('create-pod-paid')).toHaveProp('aria-checked', true);
    expect(screen.getByTestId('create-pod-price-panel')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-free-note')).toBeNull();
    // The catalogue's product carries no category, so the club's category has
    // nothing to attach and the add button stays shut.
    expect(screen.getByTestId('products-empty-category')).toBeOnTheScreen();
    expect(screen.getByTestId('product-add')).toHaveProp('aria-disabled', true);
    // Pressing the already-selected Paid card is a no-op — it stays PAID.
    press('create-pod-paid');
    // The price ships blank and gates publishing, so the host must type one.
    expect(screen.getByTestId('field-pod_amount_text')).toHaveProp('value', '');
    expect(screen.getByTestId('create-pod-submit')).toBeDisabled();
    fireEvent.changeText(screen.getByTestId('field-pod_amount_text'), '500');

    // Accept the Organizer Terms gate, then publish.
    press('create-pod-terms');
    press('create-pod-submit');
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    expect(onPublish.mock.calls[0]?.[0]).toBe('draft-1');
    const input = onPublish.mock.calls[0]?.[1];
    expect(input.pod_title).toBe('Sunday community hike');
    // No slot id: the venue is offered its window, which is the pod's window.
    expect(input.venue_slot_id).toBeNull();
    expect(input).not.toHaveProperty('venue_booking');
    expect(input.venue_offer).toEqual(
      expect.objectContaining({
        start_at: slot.start_at,
        end_at: slot.end_at,
        pets: false,
        space_label: '',
        model: 'FLAT',
        rate: 400,
        offerings: ['A projector'],
        note: '',
      }),
    );
    expect(input.location_id).toBe('l1');
    expect(input.pod_type).toBe('PAID');
    expect(new Date(input.pod_date_time).toISOString()).toBe(slot.start_at);
    // The earnings preview is fed the venue payout and Duncit's fee on top.
    expect(mockPotentialEarnings).toHaveBeenLastCalledWith(500, expect.any(Number), 'v1', {
      venue_amount: 472,
      venue_commission_on_top: 24,
    });
  });

  it('publishes a virtual pod (no venue, no slot, no place charges)', async () => {
    const { onPublish } = setup();
    await fillToPricing('VIRTUAL');
    // A virtual pod sends no venue offer: the meeting step leads straight to
    // Pricing, the last of its four steps.
    expectStep(4, 4);
    expect(screen.queryByTestId('create-pod-offer-step')).toBeNull();
    expect(screen.queryByTestId('charge-add')).toBeNull();
    press('create-pod-submit');
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    const input = onPublish.mock.calls[0]?.[1];
    expect(input.venue_id).toBeNull();
    expect(input.venue_slot_id).toBeNull();
    expect(input.meeting_platform).toBe('GOOGLE_MEET');
    expect(input.meeting_url).toBe('https://meet.duncit.com/x');
    expect(input.pod_end_date_time).not.toBeNull();
  });

  it('asks the venue for the window free: no amount, the policy and a reason, then offers it at ₹0', async () => {
    const { onPublish } = setup();
    await pickClub();
    await fillBasics();
    press('create-pod-submit');
    await pickWindow();
    // The free venue is asked for on the offer step, not beside the window.
    expect(screen.queryByTestId('create-pod-offer-model-FREE')).toBeNull();
    press('create-pod-submit');
    await screen.findByTestId('create-pod-offer-step');
    press('create-pod-offer-model-FREE');
    // Free names no amount: the rate goes, and the free policy takes its place.
    expect(screen.queryByTestId('field-venue_offer_rate')).toBeNull();
    expect(screen.getByTestId('create-pod-venue-free-policy')).toBeOnTheScreen();
    expect(screen.getByTestId('create-pod-venue-free-warning')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('field-venue_offer_offerings'), 'A projector');
    expect(await screen.findByTestId('create-pod-venue-quote-free')).toHaveTextContent(
      /the venue is paid nothing for this booking/,
    );
    // The offer step holds until the host says why it is free and accepts the policy.
    press('create-pod-submit');
    expect(await screen.findByTestId('create-pod-venue-free-reason-error')).toHaveTextContent(
      'Pick why this is free',
    );
    expectStep(4);
    expect(screen.queryByTestId('create-pod-paid')).toBeNull();
    justifyFree('create-pod-venue');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-paid');
    fireEvent.changeText(screen.getByTestId('field-pod_amount_text'), '500');
    press('create-pod-terms');
    press('create-pod-submit');
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    const input = onPublish.mock.calls[0]?.[1];
    expect(input.venue_offer).toEqual(
      expect.objectContaining({
        model: 'FREE',
        rate: 0,
        offerings: ['A projector'],
        free_justification: { reason: 'PROMOTIONAL', details: '', accepted: true },
      }),
    );
    // The pod itself stays paid.
    expect(input).toMatchObject({ pod_type: 'PAID' });
    expect(input).not.toHaveProperty('free_justification');
  });

  it('holds a virtual pod on step 3 until it has a platform and an end', async () => {
    setup();
    await pickClub('VIRTUAL');
    await fillBasics();
    press('create-pod-submit');
    await screen.findByTestId('field-meeting_url');
    fireEvent.changeText(screen.getByTestId('field-meeting_url'), 'https://meet.duncit.com/x');
    fireEvent.changeText(screen.getByTestId('field-pod_date_time_text'), typedAt(24));
    press('create-pod-submit');
    await waitFor(() => expect(screen.getByTestId('meeting_platform-error')).toBeOnTheScreen());
    expect(screen.getByTestId('pod_end_date_time_text-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-paid')).toBeNull();
  });

  it('publishes a free virtual pod with no amount and no calculation', async () => {
    const { onPublish } = setup();
    await fillToPricing('VIRTUAL');
    press('create-pod-free');
    expect(screen.getByTestId('create-pod-free')).toHaveProp('aria-checked', true);
    // Free: the amount field, the suggested prices and the earnings panel go;
    // a short note stands where they were.
    expect(screen.queryByTestId('field-pod_amount_text')).toBeNull();
    expect(screen.queryByTestId('create-pod-price-panel')).toBeNull();
    expect(screen.getByTestId('create-pod-free-note-body')).toHaveTextContent(
      /Duncit collects and pays nothing/,
    );
    // A virtual pod books no venue, so there is nothing to settle.
    expect(screen.queryByTestId('create-pod-free-note-venue')).toBeNull();
    // Free asks why, under Duncit's free policy, and the host's acceptance —
    // publishing is held until both are given.
    expect(screen.getByTestId('create-pod-pod-free-policy')).toBeOnTheScreen();
    press('create-pod-submit');
    expect(await screen.findByTestId('create-pod-pod-free-reason-error')).toHaveTextContent(
      'Pick why this is free',
    );
    expect(onPublish).not.toHaveBeenCalled();
    justifyFree('create-pod-pod');
    press('create-pod-submit');
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    expect(onPublish.mock.calls[0]?.[1]).toMatchObject({
      pod_type: 'FREE',
      pod_amount: 0,
      free_justification: { reason: 'PROMOTIONAL', details: '', accepted: true },
    });
  });

  it('keeps a free pod free when it becomes physical, and tells the host to settle the priced slot', async () => {
    const { onPublish } = setup();
    await fillToPricing('VIRTUAL');
    press('create-pod-free');

    // Back to step 1 and flip to Physical — a physical pod may be free, so the
    // pick survives the switch (the club pick is cleared with the mode). A
    // virtual pod has no offer step, so Back from Pricing is its meeting step.
    press('create-pod-back');
    await screen.findByTestId('field-meeting_url');
    expectStep(3, 4);
    press('create-pod-back');
    await screen.findByTestId('field-pod_title');
    press('create-pod-back');
    await screen.findByTestId('create-pod-mode-PHYSICAL');
    press('create-pod-mode-PHYSICAL');
    expect(screen.getByTestId('create-pod-club-c1')).toHaveProp('aria-checked', false);
    press('create-pod-club-c1');
    press('create-pod-submit');
    await screen.findByTestId('field-pod_title');
    press('create-pod-submit');

    // Step 3: a window at a partner's venue (owner-1, not the viewer), then
    // Step 4: the offer, quoted at ₹496.
    await pickWindow();
    const venueNote = screen.getByTestId('create-pod-free-venue-note');
    expect(venueNote).toHaveTextContent(/settle the venue's charges with the venue directly/);
    expect(venueNote).not.toHaveTextContent(/asked not to confirm the slot/);
    expect(venueNote).toHaveProp('role', 'status');
    press('create-pod-submit');
    await offerFlat();
    press('create-pod-submit');

    // Step 5: still free — no amount, no panel, and the note repeats the venue part.
    await screen.findByTestId('create-pod-free');
    expect(screen.getByTestId('create-pod-free')).toHaveProp('aria-checked', true);
    expect(screen.queryByTestId('field-pod_amount_text')).toBeNull();
    expect(screen.queryByTestId('create-pod-price-panel')).toBeNull();
    expect(screen.getByTestId('create-pod-free-note-venue')).toHaveTextContent(
      /settle the venue's charges/,
    );
    // Nothing billable is handed to the earnings query while the pod is free.
    expect(mockPotentialEarnings.mock.calls.at(-1)?.[0]).toBe(0);

    // Free → Paid: a blank amount the host must fill and the full calculation.
    press('create-pod-paid');
    expect(screen.getByTestId('field-pod_amount_text')).toHaveProp('value', '');
    expect(screen.getByTestId('create-pod-price-panel')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-free-note')).toBeNull();
    expect(screen.getByTestId('create-pod-submit')).toBeDisabled();
    fireEvent.changeText(screen.getByTestId('field-pod_amount_text'), '500');
    expect(mockPotentialEarnings.mock.calls.at(-1)?.[0]).toBe(500);

    // …and back to Free: the typed price is dropped again.
    press('create-pod-free');
    expect(screen.queryByTestId('field-pod_amount_text')).toBeNull();
    expect(mockPotentialEarnings.mock.calls.at(-1)?.[0]).toBe(0);
    justifyFree('create-pod-pod');
    press('create-pod-submit');
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    expect(onPublish.mock.calls[0]?.[1]).toMatchObject({
      pod_mode: 'PHYSICAL',
      pod_type: 'FREE',
      pod_amount: 0,
      venue_slot_id: null,
      venue_offer: expect.objectContaining({ start_at: slot.start_at, end_at: slot.end_at }),
      ticket_discount_enabled: false,
    });
  });

  it('says nothing about settling when the free pod books the host own venue', async () => {
    setup({ viewerUserId: 'owner-1' });
    await fillToPricing('PHYSICAL');
    press('create-pod-free');
    expect(screen.getByTestId('create-pod-free-note')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-free-note-venue')).toBeNull();
  });

  // Pricing only offers products in the pod's category, so a row carried in from
  // a draft (or from a club the host has since changed) must be dropped — left
  // in place it renders blank and the publish dies on the server category gate.
  it('drops a picked product the pod category no longer offers', async () => {
    setup({
      initialStep: 4,
      initialValues: {
        ...initialValues,
        club_id: 'c1',
        products_enabled: true,
        product_requests: [{ product_id: 'p1', quantity: 1 }],
      },
    });
    await screen.findByTestId('create-pod-paid');
    expect(screen.queryByTestId('attached-product-p1')).toBeNull();
    expect(screen.getByTestId('products-empty')).toBeOnTheScreen();
  });

  // A host with no approved category cannot publish an uncategorised pod: the
  // category is required by the schema, so step 1 holds them. Previously the
  // gate only ran when the host HAD categories, so exactly the host who could
  // not pick one was the host allowed to skip it.
  it('holds a host with no approved categories on step 1', async () => {
    setup({ hostCategories: [] });
    // Nothing to choose from — the field says why instead of showing chips.
    expect(screen.getByTestId('create-pod-category-empty')).toHaveTextContent(
      'Assigned after host onboarding',
    );
    press('create-pod-club-c1');
    press('create-pod-submit');
    await waitFor(() => expect(screen.getByTestId('create-pod-category-error')).toBeOnTheScreen());
    expect(screen.queryByTestId('field-pod_title')).toBeNull();
  });

  it('makes multi-category hosts pick a category before leaving step 1', async () => {
    const multi = [
      {
        super_category_id: 'sc-sports',
        super_category_name: 'Sports',
        category_name: 'Running',
        sub_category_name: 'Trail',
      },
      {
        super_category_id: 'sc-games',
        super_category_name: 'Games',
        category_name: 'Board',
        sub_category_name: 'Chess',
      },
    ];
    const multiClubs = [
      {
        id: 'mc1',
        club_name: 'Runners',
        location_id: 'l1',
        super_category_id: 'sc-sports',
        matched_venues: [{ id: 'v1' }],
      },
      { id: 'mc2', club_name: 'Chess', location_id: 'l1', super_category_id: 'sc-games' },
    ];
    setup({ hostCategories: multi, clubs: multiClubs });
    // The hint says what the pick means, before anything has gone wrong.
    expect(screen.getByTestId('create-pod-category-hint')).toHaveTextContent(
      'In which you want to host your session',
    );
    press('create-pod-submit');
    await waitFor(() => expect(screen.getByTestId('create-pod-category-error')).toBeOnTheScreen());
    expect(screen.queryByTestId('field-pod_title')).toBeNull();

    // Picking the Sports category scopes the club list, so the Games club
    // never appears at all, and releases step 1 once a club is picked.
    press('create-pod-category-sc-sports|');
    expect(screen.getByTestId('create-pod-club-mc1')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-club-mc2')).toBeNull();
    press('create-pod-club-mc1');
    press('create-pod-submit');
    await fillBasics();
    press('create-pod-submit');
    await screen.findByTestId('create-pod-venue-v1');
  });

  it('opens the club picker per locality and lets Edit location move the pod', async () => {
    const localityClubs = [
      {
        id: 'lc1',
        club_name: 'Camp Runners',
        location_id: 'l1',
        super_category_id: 'sc-sports',
        locality: 'Camp',
      },
      {
        id: 'lc2',
        club_name: 'Baner Runners',
        location_id: 'l1',
        super_category_id: 'sc-sports',
        locality: 'Baner',
      },
    ];
    const zonedLocations = [
      { ...locations[0], location_zones: [{ zone_name: 'Camp' }, { zone_name: 'Baner' }] },
      locations[1],
    ];
    setup({ clubs: localityClubs, locations: zonedLocations });
    // Until a locality is picked there is no club to choose from.
    expect(screen.getByTestId('create-pod-club-hint')).toHaveTextContent(
      'Pick a locality to see its clubs',
    );
    expect(screen.queryByTestId('create-pod-club-lc1')).toBeNull();
    // Pick Camp from the dropdown → only Camp's club is offered.
    press('create-pod-locality-trigger');
    press('create-pod-locality-option-Camp');
    expect(
      within(screen.getByTestId('create-pod-locality-trigger')).getByText('Camp'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('create-pod-club-hint')).toHaveTextContent('1 club in Camp');
    expect(screen.getByTestId('create-pod-club-lc1')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-club-lc2')).toBeNull();
    // "Edit location" applies the common picker's pick to THIS pod.
    mockLocationApply = [{ id: 'l1' }, 'Baner'];
    press('create-pod-edit-location');
    press('mock-location-apply');
    expect(
      within(screen.getByTestId('create-pod-locality-trigger')).getByText('Baner'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('create-pod-club-lc2')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-club-lc1')).toBeNull();
  });

  it('opens the AI-monitoring guidelines dialog from the header chip', async () => {
    setup();
    press('create-pod-ai-chip');
    await screen.findByTestId('pod-guidelines-dialog');
    expect(screen.getByText('What AI monitors')).toBeOnTheScreen();
    press('pod-guidelines-close');
  });

  it('blocks publishing when moderation flags content and jumps to the offending step', async () => {
    const onModerate = jest.fn().mockResolvedValue({
      allowed: false,
      violations: [
        {
          field: 'pod_description',
          step: 'REGEX',
          type: 'EMAIL',
          message: 'Remove the email address',
          evidence: 'a@b.com',
        },
      ],
    });
    const { onPublish } = setup({ onModerate });
    await fillToPricing('PHYSICAL');
    press('create-pod-submit');
    await screen.findByTestId('moderation-blocked-dialog');
    // The message shows in the dialog (and, after the jump, inline on the field).
    expect(screen.getAllByText('Remove the email address').length).toBeGreaterThan(0);
    expect(onPublish).not.toHaveBeenCalled();
    // The "Fix in …" link jumps back to the Basics step and sets an inline error.
    press('moderation-fix-pod_description-EMAIL-0');
    await screen.findByTestId('field-pod_description');
    expectStep(2);
    expect(screen.getByTestId('pod_description-error')).toHaveTextContent(
      'Remove the email address',
    );
  });

  it('lets the host dismiss the moderation dialog without publishing (unknown field → Basics)', async () => {
    const onModerate = jest.fn().mockResolvedValue({
      allowed: false,
      violations: [
        {
          field: 'weird',
          step: 'AI',
          type: 'ABUSE',
          message: 'Remove offensive language',
          evidence: 'x',
        },
      ],
    });
    const { onPublish } = setup({ onModerate });
    await fillToPricing('PHYSICAL');
    press('create-pod-submit');
    await screen.findByTestId('moderation-blocked-dialog');
    press('moderation-blocked-close');
    expect(screen.queryByTestId('moderation-blocked-dialog')).toBeNull();
    expect(onPublish).not.toHaveBeenCalled();
  });

  it('lists category clubs from any city until a location is picked', async () => {
    setup({ initialValues: { ...initialValues, location_id: '' } });
    await screen.findByTestId('create-pod-club-c1');
    // No location yet → category match alone, so the other-city club c3 shows too.
    expect(screen.getByTestId('create-pod-club-c3')).toBeOnTheScreen();
    // Category gate still applies: c4 (other category) stays hidden.
    expect(screen.queryByTestId('create-pod-club-c4')).toBeNull();
  });

  it('matches clubs by the host super + sub category', async () => {
    const subClubs = [
      {
        id: 'sc1',
        club_name: 'Trail Club',
        location_id: 'l1',
        super_category_id: 'sc-sports',
        category_id: 'sub-trail',
      },
      {
        id: 'sc2',
        club_name: 'Road Club',
        location_id: 'l1',
        super_category_id: 'sc-sports',
        category_id: 'sub-road',
      },
    ];
    const subHost = [
      {
        super_category_id: 'sc-sports',
        sub_category_id: 'sub-trail',
        super_category_name: 'Sports',
        category_name: 'Running',
        sub_category_name: 'Trail',
      },
    ];
    setup({ clubs: subClubs, hostCategories: subHost });
    // Only the same sub-category (Trail) club matches.
    expect(await screen.findByTestId('create-pod-club-sc1')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-club-sc2')).toBeNull();
  });

  it('treats a super-only host entry as matching clubs of any sub in that super', async () => {
    const mixClubs = [
      {
        id: 'mx1',
        club_name: 'Trail Club',
        location_id: 'l1',
        super_category_id: 'sc-sports',
        category_id: 'sub-trail',
      },
      {
        id: 'mx2',
        club_name: 'Road Club',
        location_id: 'l1',
        super_category_id: 'sc-sports',
        category_id: 'sub-road',
      },
    ];
    // Default hostCategories carries a super but no sub → any sub matches.
    setup({ clubs: mixClubs });
    expect(await screen.findByTestId('create-pod-club-mx1')).toBeOnTheScreen();
    expect(screen.getByTestId('create-pod-club-mx2')).toBeOnTheScreen();
  });

  it('lets a physical pod pick any club — venues are booked at their own pricing on step 3', () => {
    setup();
    press('create-pod-club-c2');
    expect(screen.getByTestId('create-pod-club-c2')).toHaveProp('aria-checked', true);
  });

  it('blocks Next while the current step is invalid', async () => {
    setup();
    // Step 1: club missing.
    press('create-pod-submit');
    await waitFor(() => expect(screen.getByTestId('create-pod-club-error')).toBeOnTheScreen());
    expect(screen.queryByTestId('field-pod_title')).toBeNull();
    press('create-pod-club-c1');
    press('create-pod-submit');
    // Step 2: basics missing.
    await screen.findByTestId('field-pod_title');
    press('create-pod-submit');
    await waitFor(() => expect(screen.getByTestId('pod_title-error')).toBeOnTheScreen());
    // Step 3 never rendered.
    expect(screen.queryByTestId('create-pod-venue-v1')).toBeNull();
  });

  it('requires a booked window before leaving the venue step', async () => {
    setup();
    await pickClub();
    await fillBasics();
    press('create-pod-submit');
    await screen.findByTestId('create-pod-venue-v1');
    press('create-pod-venue-v1');
    // Pick a space so the booking calendar (and its error) render, but book nothing.
    press('create-pod-space-Whole venue');
    await screen.findByTestId(slotTile);
    press('create-pod-submit');
    await waitFor(() =>
      expect(screen.getByTestId('slot-calendar-error')).toHaveTextContent(
        'Pick a date and time the venue is free',
      ),
    );
    expectStep(3);
    expect(screen.queryByTestId('create-pod-offer-step')).toBeNull();
  });

  it('says why the server will not take an offer, and holds the host until terms are given', async () => {
    mockGraphqlRequest.mockImplementation((doc: Parameters<typeof routeRequests>[0]) =>
      doc.definitions[0]?.name?.value === 'MobileVenueOfferQuote'
        ? Promise.resolve({
            venueOfferQuote: {
              ok: false,
              message: 'The venue is closed at this time',
              quote: null,
            },
          })
        : routeRequests(doc),
    );
    setup();
    await pickClub();
    await fillBasics();
    press('create-pod-submit');
    await pickWindow();
    press('create-pod-submit');
    await screen.findByTestId('create-pod-offer-step');
    // No pricing option or amount yet: validation holds the host on the offer step.
    await act(async () => {
      press('create-pod-submit');
    });
    expectStep(4);
    expect(screen.queryByTestId('create-pod-paid')).toBeNull();
    press('create-pod-offer-model-FLAT');
    fireEvent.changeText(screen.getByTestId('field-venue_offer_rate'), '900');
    expect(await screen.findByTestId('create-pod-offer-problem')).toHaveTextContent(
      'The venue is closed at this time',
    );
  });

  it('surfaces a publish error message', async () => {
    setup({ onPublish: jest.fn().mockRejectedValue(new Error('Server said no')) });
    await fillToPricing('PHYSICAL');
    press('create-pod-submit');
    await waitFor(() =>
      expect(screen.getByTestId('create-pod-error')).toHaveTextContent('Server said no'),
    );
  });

  it('falls back to a generic message for non-Error publish failures', async () => {
    setup({ onPublish: jest.fn().mockRejectedValue('nope') });
    await fillToPricing('PHYSICAL');
    press('create-pod-submit');
    await waitFor(() =>
      expect(screen.getByTestId('create-pod-error')).toHaveTextContent('Could not create the pod.'),
    );
  });

  it('keeps navigating even when a draft autosave fails', async () => {
    setup({ onSaveDraft: jest.fn().mockRejectedValue(new Error('save failed')) });
    await pickClub();
    expect(await screen.findByTestId('field-pod_title')).toBeOnTheScreen();
  });

  it('autosaves the draft after the debounce window', () => {
    jest.useFakeTimers();
    try {
      const { onSaveDraft } = setup();
      press('create-pod-club-c1');
      act(() => {
        jest.advanceTimersByTime(3999);
      });
      expect(onSaveDraft).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(onSaveDraft).toHaveBeenCalled();
      // The draft is saved against the step the host is on.
      expect(onSaveDraft.mock.calls[0]?.[1].step).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows the busy state while the publish is in flight', async () => {
    setup({ onPublish: jest.fn(() => new Promise<void>(() => undefined)) });
    await fillToPricing('PHYSICAL');
    press('create-pod-submit');
    expect(await screen.findByTestId('create-pod-submit-spinner')).toBeOnTheScreen();
  });

  it('resumes at the provided step', () => {
    setup({ initialStep: 4, initialValues: { ...initialValues, pod_title: 'Resumed' } });
    expectStep(5);
    expect(screen.getByTestId('create-pod-paid')).toBeOnTheScreen();
  });

  it('resumes a physical draft saved on the offer step there', () => {
    setup({ initialStep: 3, initialValues: { ...initialValues, pod_mode: 'PHYSICAL' } });
    expectStep(4);
    expect(screen.getByTestId('create-pod-offer-step')).toBeOnTheScreen();
  });

  it('resumes a draft on a step the pod does not walk at the next one', () => {
    // A virtual pod sends no venue offer, so its draft lands on Pricing.
    setup({ initialStep: 3, initialValues: { ...initialValues, pod_mode: 'VIRTUAL' } });
    expectStep(4, 4);
    expect(screen.queryByTestId('create-pod-offer-step')).toBeNull();
    expect(screen.getByTestId('create-pod-paid')).toBeOnTheScreen();
  });

  it('hides the products section when gated off', () => {
    mockFeatureFlag.mockReturnValue(false);
    // A stale draft saved on the old 8-step flow lands past the new range.
    setup({
      initialStep: 7,
      initialValues: {
        ...initialValues,
        products_enabled: true,
        product_requests: [{ product_id: 'p1', quantity: 2 }],
      },
    });
    expectStep(5);
    expect(screen.getByTestId('create-pod-paid')).toBeOnTheScreen();
    expect(screen.queryByTestId('pricing-step-products-card')).toBeNull();
    expect(screen.queryByTestId('product-add')).toBeNull();
  });

  it('starts a clean draft on step 1 when products are gated off', () => {
    mockFeatureFlag.mockReturnValue(false);
    setup();
    expectStep(1);
    expect(screen.getByTestId('create-pod-club-c1')).toBeOnTheScreen();
  });

  it('clears orphaned product requests even when the toggle was off', () => {
    mockFeatureFlag.mockReturnValue(false);
    setup({
      initialStep: 4,
      initialValues: {
        ...initialValues,
        products_enabled: false,
        product_requests: [{ product_id: 'p1', quantity: 2 }],
      },
    });
    expect(screen.getByTestId('create-pod-paid')).toBeOnTheScreen();
  });
});

// A per-guest offer to a venue that takes bookings for at least 8 guests, in a
// space that holds 20: the spots start at the venue's minimum, and both the
// price and the host's earnings read as ranges from 8 guests up to 20 spots.
describe('CreatePodStepper — a venue minimum', () => {
  const breakdown = (pax: number, payout: number, fee: number) => ({
    ...venuePriceQuote,
    model: 'PER_GUEST',
    rate: 300,
    pax,
    base: payout,
    taxes: 0,
    gst_pct: 0,
    platform_fee: fee,
    venue_payout: payout,
    total: payout + fee,
  });
  const minimumVenue = {
    id: 'v1',
    owner_user_id: 'owner-1',
    venue_name: 'Hall',
    location_id: 'l1',
    city: 'Pune',
    capacity: 20,
    offer_min_guests: 8,
  };

  const quoteCalls = () =>
    mockGraphqlRequest.mock.calls.filter(
      ([doc]) => doc.definitions[0]?.name?.value === 'MobileVenueOfferQuote',
    );

  it('floors the spots at the minimum, prices both ends and sends both to the earnings preview', async () => {
    mockGraphqlRequest.mockImplementation((doc: { definitions: { name?: { value: string } }[] }) =>
      doc.definitions[0]?.name?.value === 'MobileVenueOfferQuote'
        ? Promise.resolve({
            venueOfferQuote: {
              ok: true,
              message: null,
              quote: breakdown(20, 6000, 300),
              quote_min: breakdown(8, 2400, 120),
            },
          })
        : routeRequests(doc),
    );
    const { onPublish } = setup({ venues: [minimumVenue] });
    await pickClub();
    await fillBasics();
    press('create-pod-submit');
    await screen.findByTestId('create-pod-venue-v1');
    press('create-pod-venue-v1');
    press('create-pod-space-Whole venue');
    expect(await screen.findByTestId('create-pod-venue-minimum')).toHaveTextContent(
      'This venue takes bookings for at least 8 guests.',
    );
    expect(screen.getByTestId('create-pod-spots-bounds')).toHaveTextContent(/Pick 8 to 20 spots/);
    await screen.findByTestId(slotTile);
    press(slotTile);
    await screen.findByTestId(endChip);
    press(endChip);
    press('create-pod-submit');
    await screen.findByTestId('create-pod-offer-step');
    press('create-pod-offer-model-PER_GUEST');
    // Once picked, the option says how it pays the venue.
    expect(screen.getByText(/A minimum order value per person/)).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('field-venue_offer_rate'), '300');
    expect(await screen.findByTestId('create-pod-quote-venue-range')).toHaveTextContent(
      '₹2,400.00 – ₹6,000.00',
    );
    expect(screen.getByTestId('create-pod-quote-total-range')).toHaveTextContent(
      '₹2,520.00 – ₹6,300.00',
    );
    expect(screen.getByText('Breakdown at 20 guests')).toBeOnTheScreen();

    // The points and the note go with the offer, but never ask for a new price.
    const priced = quoteCalls().length;
    fireEvent.changeText(screen.getByTestId('field-venue_offer_offerings'), 'Projector\n10 chairs');
    fireEvent.changeText(screen.getByTestId('field-venue_offer_note'), 'A quiet corner');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    expect(quoteCalls()).toHaveLength(priced);
    expect(JSON.stringify(quoteCalls().at(-1)?.[1])).not.toMatch(/offerings|note/);

    press('create-pod-submit');
    await screen.findByTestId('create-pod-paid');
    fireEvent.changeText(screen.getByTestId('field-pod_amount_text'), '500');
    expect(mockPotentialEarnings).toHaveBeenLastCalledWith(500, 20, 'v1', {
      venue_amount: 6000,
      venue_commission_on_top: 300,
      min_spots: 8,
      venue_amount_at_min: 2400,
      venue_commission_on_top_at_min: 120,
    });
    press('create-pod-terms');
    press('create-pod-submit');
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    expect(onPublish.mock.calls[0]?.[1].venue_offer).toEqual(
      expect.objectContaining({
        pax: 20,
        model: 'PER_GUEST',
        rate: 300,
        offerings: ['Projector', '10 chairs'],
        note: 'A quiet corner',
      }),
    );
  });

  it('holds the host on the offer step until they say what they need from the venue', async () => {
    setup();
    await pickClub();
    await fillBasics();
    press('create-pod-submit');
    await pickWindow();
    // No minimum is named for a venue without one.
    expect(screen.queryByTestId('create-pod-venue-minimum')).toBeNull();
    press('create-pod-submit');
    await screen.findByTestId('create-pod-offer-step');
    press('create-pod-offer-model-FLAT');
    fireEvent.changeText(screen.getByTestId('field-venue_offer_rate'), '400');
    await act(async () => {
      press('create-pod-submit');
    });
    expectStep(4);
    expect(
      await screen.findByText('Add at least one thing you need from the venue'),
    ).toBeOnTheScreen();
    // …and a venue that names no minimum business shows none.
    expect(screen.queryByTestId('create-pod-venue-min-business')).toBeNull();
  });

  it("holds an offer below the venue's minimum business for the way the host pays", async () => {
    const flooredVenue = {
      ...venues[0],
      offer_min_business: [{ model: 'PER_GUEST', amount: 200 }],
    };
    setup({ venues: [flooredVenue] });
    await pickClub();
    await fillBasics();
    press('create-pod-submit');
    await pickWindow();
    // The minimum business is the offer step's, not the venue step's.
    expect(screen.queryByTestId('create-pod-venue-min-business')).toBeNull();
    press('create-pod-submit');
    await screen.findByTestId('create-pod-offer-step');
    expect(screen.getByTestId('create-pod-venue-min-business')).toHaveTextContent(
      /₹200 per guest/,
    );
    press('create-pod-offer-model-PER_GUEST');
    fireEvent.changeText(screen.getByTestId('field-venue_offer_rate'), '150');
    fireEvent.changeText(screen.getByTestId('field-venue_offer_offerings'), 'A projector');
    await act(async () => {
      press('create-pod-submit');
    });
    expectStep(4);
    expect(
      await screen.findByText(
        'This venue takes at least ₹200 per guest — raise your offer to continue',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-paid')).toBeNull();
    // Raised to the minimum, the offer leaves the step.
    fireEvent.changeText(screen.getByTestId('field-venue_offer_rate'), '200');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-paid');
    expectStep(5);
  });
});
