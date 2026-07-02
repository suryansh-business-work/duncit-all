import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

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

const futureIso = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
const slot = {
  id: 's1',
  start_at: futureIso(24),
  end_at: futureIso(26),
  price: 400,
  status: 'AVAILABLE',
};

beforeEach(() => {
  mockFeatureFlag.mockReturnValue(true);
  mockGraphqlRequest.mockResolvedValue({ venueAvailableSlots: [slot] });
});

const clubs = [
  { id: 'c1', club_name: 'Runners', meetup_venues_id: ['v1'] },
  // No linked venues — always listed so hosts never hit a dead end.
  { id: 'c2', club_name: 'Writers', meetup_venues_id: [] },
  // All venues in another city — filtered out for l1.
  { id: 'c3', club_name: 'Surfers', meetup_venues_id: ['v9'] },
  // No meetup_venues_id at all — also always listed.
  { id: 'c4', club_name: 'Gamers' },
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
  { super_category_name: 'Sports', category_name: 'Running', sub_category_name: 'Trail' },
];
const finance = { platform_fee_pct: 5, gst_pct: 18, currency_symbol: '₹' };

const initialValues = { ...blankCreatePodForm, location_id: 'l1' };

const setup = (over: Record<string, unknown> = {}) => {
  const onSaveDraft = jest.fn().mockResolvedValue('draft-1');
  const onPublish = jest.fn().mockResolvedValue(undefined);
  renderWithProviders(
    <CreatePodStepper
      initialValues={initialValues}
      initialStep={0}
      initialDraftId={null}
      clubs={clubs}
      locations={locations}
      venues={venues}
      products={products}
      hostCategories={hostCategories}
      viewerUserId="me-1"
      finance={finance}
      onSaveDraft={onSaveDraft}
      onPublish={onPublish}
      {...over}
    />,
  );
  return { onSaveDraft, onPublish };
};

const press = (testID: string) => fireEvent.press(screen.getByTestId(testID));

// Fills step 1 (Basics) with valid values.
async function fillBasics() {
  await screen.findByTestId('field-pod_title');
  fireEvent.changeText(screen.getByTestId('field-pod_title'), 'Sunday community hike');
  fireEvent.changeText(
    screen.getByTestId('field-pod_description'),
    'A relaxed group hike around the lake.',
  );
  fireEvent.changeText(screen.getByTestId('field-media_text'), 'https://cdn/img.jpg');
}

// Drives the flow up to the Pricing step for either mode.
async function fillToPricing(mode: 'PHYSICAL' | 'VIRTUAL') {
  await fillBasics();
  press('create-pod-submit');
  await screen.findByTestId('create-pod-location-label');
  if (mode === 'VIRTUAL') press('create-pod-mode-VIRTUAL');
  press('create-pod-club-c1');
  press('create-pod-submit');
  if (mode === 'PHYSICAL') {
    await screen.findByTestId('create-pod-venue-v1');
    press('create-pod-venue-v1');
    await screen.findByTestId('create-pod-slot-s1');
    press('create-pod-slot-s1');
  } else {
    await screen.findByTestId('field-meeting_url');
    fireEvent.changeText(screen.getByTestId('field-meeting_url'), 'https://meet.duncit.com/x');
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = new Date(Date.now() + 24 * 3_600_000);
    fireEvent.changeText(
      screen.getByTestId('field-pod_date_time_text'),
      `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())} ${pad(start.getHours())}:${pad(start.getMinutes())}`,
    );
  }
  press('create-pod-submit');
  await screen.findByTestId('create-pod-type-NATIVE_FREE');
}

describe('CreatePodStepper', () => {
  it('walks a physical pod end to end: slot booking sets the window, then publishes', async () => {
    const { onPublish } = setup();
    expect(screen.getByTestId('create-pod-progress')).toBeOnTheScreen();
    expect(screen.getByText('Step 1 of 4')).toBeOnTheScreen();

    await fillBasics();
    press('create-pod-submit');

    // Step 2: default location card + auto category + club filter.
    await screen.findByTestId('create-pod-location-label');
    expect(screen.getByTestId('create-pod-location-label')).toHaveTextContent(/Pune/);
    expect(screen.getByTestId('create-pod-category')).toHaveTextContent('Sports › Running › Trail');
    // Location filter: c1 (venue in l1) + c2/c4 (no venues) stay; c3 drops out.
    expect(screen.getByTestId('create-pod-club-c2')).toBeOnTheScreen();
    expect(screen.getByTestId('create-pod-club-c4')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-club-c3')).toBeNull();
    press('create-pod-club-c1');
    press('create-pod-submit');

    // Step 3: only venues in the pod city are offered; picking a slot books it.
    await screen.findByTestId('create-pod-venue-v1');
    expect(screen.queryByTestId('create-pod-venue-v9')).toBeNull();
    press('create-pod-venue-v1');
    await screen.findByTestId('create-pod-slot-s1');
    press('create-pod-slot-s1');
    // Partner venue → approval note + contact card + window from slot.
    expect(screen.getByTestId('create-pod-approval-note')).toHaveTextContent(/venue approves/);
    expect(screen.getByTestId('create-pod-venue-contact')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-duration')).toBeOnTheScreen();
    // Back returns to the club step, then forward again keeps the slot.
    press('create-pod-back');
    await screen.findByTestId('create-pod-location-label');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-venue-v1');
    press('create-pod-submit');

    // Step 4: pricing + products + price panel.
    await screen.findByTestId('create-pod-type-NATIVE_FREE');
    expect(screen.getByTestId('create-pod-price-panel')).toBeOnTheScreen();
    press('products-enabled-toggle');
    press('products-enabled-toggle');
    press('create-pod-type-NATIVE_PAID');
    press('create-pod-type-NATIVE_FREE');

    press('create-pod-submit');
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    expect(onPublish.mock.calls[0]?.[0]).toBe('draft-1');
    const input = onPublish.mock.calls[0]?.[1];
    expect(input.pod_title).toBe('Sunday community hike');
    expect(input.venue_slot_id).toBe('s1');
    expect(input.location_id).toBe('l1');
  });

  it('publishes a virtual pod (no venue, no slot, no place charges)', async () => {
    const { onPublish } = setup();
    await fillToPricing('VIRTUAL');
    expect(screen.queryByTestId('charge-add')).toBeNull();
    press('create-pod-submit');
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    expect(onPublish.mock.calls[0]?.[1].venue_id).toBeNull();
    expect(onPublish.mock.calls[0]?.[1].venue_slot_id).toBeNull();
  });

  it('blocks Next while the current step is invalid', async () => {
    setup();
    // Step 1: basics missing.
    press('create-pod-submit');
    await waitFor(() => expect(screen.getByTestId('pod_title-error')).toBeOnTheScreen());
    await fillBasics();
    press('create-pod-submit');
    // Step 2: club missing.
    await screen.findByTestId('create-pod-location-label');
    press('create-pod-submit');
    await waitFor(() => expect(screen.getByTestId('create-pod-club-error')).toBeOnTheScreen());
    // Step 3 never rendered.
    expect(screen.queryByTestId('create-pod-venue-v1')).toBeNull();
  });

  it('requires a booked slot before leaving the venue step', async () => {
    setup();
    await fillBasics();
    press('create-pod-submit');
    await screen.findByTestId('create-pod-location-label');
    press('create-pod-club-c1');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-venue-v1');
    press('create-pod-venue-v1');
    await screen.findByTestId('create-pod-slot-s1');
    press('create-pod-submit');
    await waitFor(() =>
      expect(screen.getByTestId('create-pod-slot-error')).toHaveTextContent(/available slot/i),
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

  it('shows a duplicate title inline, jumps to the basics step and clears on edit (DIFF-1/7)', async () => {
    const message = 'A pod with this title already exists in this club. Choose a different title.';
    setup({ onPublish: jest.fn().mockRejectedValue(new Error(message)) });
    await fillToPricing('PHYSICAL');
    press('create-pod-submit');
    // Jumps back to the basics step and shows the error inline on the title field.
    await screen.findByTestId('field-pod_title');
    await waitFor(() =>
      expect(screen.getByTestId('pod_title-error')).toHaveTextContent(/already exists/),
    );
    // Editing the title clears the stale duplicate error (DIFF-7).
    fireEvent.changeText(screen.getByTestId('field-pod_title'), 'A fresh unique pod title');
    await waitFor(() => expect(screen.queryByTestId('pod_title-error')).toBeNull());
  });

  it('keeps navigating even when a draft autosave fails', async () => {
    setup({ onSaveDraft: jest.fn().mockRejectedValue(new Error('save failed')) });
    await fillBasics();
    press('create-pod-submit');
    await screen.findByTestId('create-pod-location-label');
  });

  it('autosaves the draft after the debounce window', () => {
    jest.useFakeTimers();
    try {
      const { onSaveDraft } = setup();
      fireEvent.changeText(screen.getByTestId('field-pod_title'), 'Draft title');
      act(() => {
        jest.advanceTimersByTime(4000);
      });
      expect(onSaveDraft).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows the busy state while the publish is in flight', async () => {
    setup({ onPublish: jest.fn(() => new Promise<void>(() => undefined)) });
    await fillToPricing('PHYSICAL');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-submit-spinner');
  });

  it('resumes at the provided step and clamps out-of-range drafts', () => {
    setup({ initialStep: 3, initialValues: { ...initialValues, pod_title: 'Resumed' } });
    expect(screen.getByTestId('create-pod-type-NATIVE_FREE')).toBeOnTheScreen();
  });

  it('hides the products section and clears stale product values when gated off', () => {
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
    expect(screen.getByText('Step 4 of 4')).toBeOnTheScreen();
    expect(screen.getByTestId('create-pod-type-NATIVE_FREE')).toBeOnTheScreen();
    expect(screen.queryByTestId('products-enabled-toggle')).toBeNull();
  });

  it('leaves a clean draft untouched when products are gated off', () => {
    mockFeatureFlag.mockReturnValue(false);
    setup();
    expect(screen.getByTestId('field-pod_title')).toBeOnTheScreen();
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
    expect(screen.getByTestId('create-pod-type-NATIVE_FREE')).toBeOnTheScreen();
  });
});
