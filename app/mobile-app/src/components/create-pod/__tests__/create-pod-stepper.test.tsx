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
jest.mock('@/hooks/usePotentialEarnings', () => ({
  usePotentialEarnings: () => ({ waterfall: null, isLoading: false }),
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

const futureIso = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
const slot = {
  id: 's1',
  start_at: futureIso(24),
  end_at: futureIso(26),
  price: 400,
  capacity: 30,
  status: 'AVAILABLE',
};

beforeEach(() => {
  mockFeatureFlag.mockReturnValue(true);
  mockGraphqlRequest.mockResolvedValue({ venueAvailableSlots: [slot] });
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
    // A physical pod can only pick a club with an open slot.
    available_slots_count: 3,
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

// Step 3 for a physical pod: venue → space (capacity) → a slot on the calendar.
async function bookSlot() {
  await screen.findByTestId('create-pod-venue-v1');
  press('create-pod-venue-v1');
  // The space (capacity) selector gates the slot calendar — pick the whole venue.
  press('create-pod-space-Whole venue');
  await screen.findByTestId('slot-tile-s1');
  press('slot-tile-s1');
}

// Drives the flow up to the Pricing step for either mode.
async function fillToPricing(mode: 'PHYSICAL' | 'VIRTUAL') {
  await pickClub(mode);
  await fillBasics();
  press('create-pod-submit');
  if (mode === 'PHYSICAL') {
    await bookSlot();
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
  // The Paid card is the one constant on the pricing step — FREE is virtual-only,
  // so a physical pod never renders a Free card.
  await screen.findByTestId('create-pod-paid');
  // The Ticket Price field ships blank and gates Create Pod, so a paid pod is
  // only publishable once the host types a price.
  fireEvent.changeText(screen.getByTestId('field-pod_amount_text'), '500');
  // Accept the Organizer Terms gate so the final publish validates.
  press('create-pod-terms');
}

const expectStep = (step: number) =>
  expect(screen.getByTestId('create-pod-progress')).toHaveProp('aria-label', `Step ${step} of 4`);

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
    await bookSlot();
    // Partner venue → approval note + contact card + window from slot.
    expect(screen.getByTestId('create-pod-approval-note')).toHaveTextContent(/venue approves/);
    expect(screen.getByTestId('create-pod-venue-contact')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-duration')).toBeOnTheScreen();
    // Back returns to the basics step, then forward again keeps the slot.
    press('create-pod-back');
    await screen.findByTestId('field-pod_title');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-venue-v1');
    expect(screen.getByTestId('create-pod-approval-note')).toBeOnTheScreen();
    press('create-pod-submit');

    // Step 4: pricing + products + price panel. This pod is PHYSICAL, so it is
    // always PAID — the Free card is not offered and Paid is preselected.
    await screen.findByTestId('create-pod-paid');
    expectStep(4);
    expect(screen.queryByTestId('create-pod-free')).toBeNull();
    expect(screen.getByTestId('create-pod-paid')).toHaveProp('aria-checked', true);
    expect(screen.getByTestId('create-pod-price-panel')).toBeOnTheScreen();
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
    expect(input.venue_slot_id).toBe('s1');
    expect(input.location_id).toBe('l1');
    expect(input.pod_type).toBe('PAID');
    // The booked slot's window is the pod's window.
    expect(new Date(input.pod_date_time).getTime()).toBe(
      Math.floor(new Date(slot.start_at).getTime() / 60_000) * 60_000,
    );
  });

  it('publishes a virtual pod (no venue, no slot, no place charges)', async () => {
    const { onPublish } = setup();
    await fillToPricing('VIRTUAL');
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

  it('publishes a free virtual pod and drops FREE when the mode flips back to physical', async () => {
    const { onPublish } = setup();
    await fillToPricing('VIRTUAL');
    // A virtual pod may be Free; picking it locks the ticket price at zero.
    press('create-pod-free');
    expect(screen.getByTestId('create-pod-free')).toHaveProp('aria-checked', true);
    expect(screen.getByTestId('field-pod_amount_text')).toHaveProp('editable', false);
    expect(screen.getByTestId('pod_amount_text-hint')).toHaveTextContent('Free pods are ₹0.');

    // Back to step 1 and flip to Physical — FREE is virtual-only, so the pick
    // must not survive the switch (and the club pick is cleared with the mode).
    press('create-pod-back');
    await screen.findByTestId('field-meeting_url');
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
    // Finish the physical path and confirm the pod is back on Paid.
    await bookSlot();
    press('create-pod-submit');
    await screen.findByTestId('create-pod-paid');
    expect(screen.queryByTestId('create-pod-free')).toBeNull();
    expect(screen.getByTestId('create-pod-paid')).toHaveProp('aria-checked', true);
    // The ₹0 the Free pick forced does not survive either — the paid pod is
    // blank again and must be priced by the host before it can publish.
    expect(screen.getByTestId('field-pod_amount_text')).toHaveProp('value', '');
    fireEvent.changeText(screen.getByTestId('field-pod_amount_text'), '500');
    press('create-pod-submit');
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    expect(onPublish.mock.calls[0]?.[1].pod_type).toBe('PAID');
  });

  // Step 4 only offers products in the pod's category, so a row carried in from
  // a draft (or from a club the host has since changed) must be dropped — left
  // in place it renders blank and the publish dies on the server category gate.
  it('drops a picked product the pod category no longer offers', async () => {
    setup({
      initialStep: 3,
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
        available_slots_count: 2,
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

  it('refuses a physical club with no open slots and keeps step 1 unpicked', async () => {
    setup();
    // c2 has no open slots: the press opens the no-slots sheet instead of picking it.
    press('create-pod-club-c2');
    expect(screen.getByTestId('create-pod-club-c2')).toHaveProp('aria-checked', false);
    press('create-pod-submit');
    await waitFor(() => expect(screen.getByTestId('create-pod-club-error')).toBeOnTheScreen());
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

  it('requires a booked slot before leaving the venue step', async () => {
    setup();
    await pickClub();
    await fillBasics();
    press('create-pod-submit');
    await screen.findByTestId('create-pod-venue-v1');
    press('create-pod-venue-v1');
    // Pick a space so the slot calendar (and its error) render, but leave the slot unbooked.
    press('create-pod-space-Whole venue');
    await screen.findByTestId('slot-tile-s1');
    press('create-pod-submit');
    await waitFor(() =>
      expect(screen.getByTestId('slot-calendar-error')).toHaveTextContent(/available slot/i),
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

  it('resumes at the provided step and clamps out-of-range drafts', () => {
    setup({ initialStep: 3, initialValues: { ...initialValues, pod_title: 'Resumed' } });
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
    expectStep(4);
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
      initialStep: 3,
      initialValues: {
        ...initialValues,
        products_enabled: false,
        product_requests: [{ product_id: 'p1', quantity: 2 }],
      },
    });
    expect(screen.getByTestId('create-pod-paid')).toBeOnTheScreen();
  });
});
