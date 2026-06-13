import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CreatePodStepper } from '@/components/create-pod/CreatePodStepper';
import { blankCreatePodForm } from '@/components/create-pod/create-pod.types';
import { renderWithProviders } from '@/utils/test-utils';

const toText = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const futureText = toText(new Date(Date.now() + 24 * 3_600_000));
const futureEndText = toText(new Date(Date.now() + 26 * 3_600_000));

const clubs = [
  { id: 'c1', club_name: 'Runners', meetup_venues_id: ['v1'] },
  // No linked venues — always listed so hosts never hit a dead end.
  { id: 'c2', club_name: 'Writers', meetup_venues_id: [] },
  // All venues in another city — filtered out for l1.
  { id: 'c3', club_name: 'Surfers', meetup_venues_id: ['v9'] },
  // No meetup_venues_id at all — also always listed.
  { id: 'c4', club_name: 'Gamers' },
];
const locations = [{ id: 'l1', location_name: 'Pune', city: 'Pune' }];
const venueLocations = [{ id: 'v1', location_id: 'l1' }];
const venues = [
  {
    id: 'v1',
    venue_name: 'Hall',
    city: 'Pune',
    locality: 'Camp',
    address_line1: 'St 1',
    state: 'MH',
    postal_code: '411001',
    country: 'IN',
  },
];
const products = [{ id: 'p1', product_name: 'Water', unit_cost: 20, available_count: 10 }];

const setup = (over: Record<string, unknown> = {}) => {
  const onSaveDraft = jest.fn().mockResolvedValue('draft-1');
  const onPublish = jest.fn().mockResolvedValue(undefined);
  renderWithProviders(
    <CreatePodStepper
      initialValues={blankCreatePodForm}
      initialStep={0}
      initialDraftId={null}
      clubs={clubs}
      locations={locations}
      venueLocations={venueLocations}
      venues={venues}
      products={products}
      onSaveDraft={onSaveDraft}
      onPublish={onPublish}
      {...over}
    />,
  );
  return { onSaveDraft, onPublish };
};

const press = (testID: string) => fireEvent.press(screen.getByTestId(testID));

// Drives steps 1→8. Picks the host city, then the club; physical picks a
// venue; virtual fills the meeting link.
async function fillToStep7(mode: 'PHYSICAL' | 'VIRTUAL') {
  press('create-pod-location-l1');
  press('create-pod-submit');
  await screen.findByTestId('field-pod_title');
  fireEvent.changeText(screen.getByTestId('field-pod_title'), 'Sunday community hike');
  press('create-pod-club-c1');
  if (mode === 'VIRTUAL') press('create-pod-mode-VIRTUAL');
  press('create-pod-submit');
  if (mode === 'PHYSICAL') {
    await screen.findByTestId('create-pod-venue-v1');
    press('create-pod-venue-v1');
  } else {
    await screen.findByTestId('field-meeting_url');
    fireEvent.changeText(screen.getByTestId('field-meeting_url'), 'https://meet.duncit.com/x');
  }
  fireEvent.changeText(screen.getByTestId('field-pod_date_time_text'), futureText);
  press('create-pod-submit');
  await screen.findByTestId('field-pod_description');
  fireEvent.changeText(
    screen.getByTestId('field-pod_description'),
    'A relaxed group hike around the lake.',
  );
  fireEvent.changeText(screen.getByTestId('field-media_text'), 'https://cdn/img.jpg');
  press('create-pod-submit');
  await screen.findByTestId('create-pod-offers-input');
  press('create-pod-submit');
  await screen.findByTestId('create-pod-perks-input');
  press('create-pod-submit');
  await screen.findByTestId('products-enabled-toggle');
  press('create-pod-submit');
  await screen.findByTestId('create-pod-type-NATIVE_FREE');
}

describe('CreatePodStepper', () => {
  it('walks a physical pod end to end and publishes the draft', async () => {
    const { onPublish } = setup();
    expect(screen.getByTestId('create-pod-progress')).toBeOnTheScreen();

    // Step 1: pick the host city (clubs load for it on the next step).
    press('create-pod-location-l1');
    press('create-pod-submit');
    await screen.findByTestId('field-pod_title');
    // Location filter: c1 (venue in l1) + c2 (no venues) stay; c3 drops out.
    expect(screen.getByTestId('create-pod-club-c2')).toBeOnTheScreen();
    expect(screen.getByTestId('create-pod-club-c4')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-club-c3')).toBeNull();
    fireEvent.changeText(screen.getByTestId('field-pod_title'), 'Sunday community hike');
    press('create-pod-club-c1');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-venue-v1');
    // Back returns to the club step, then forward again.
    press('create-pod-back');
    await screen.findByTestId('field-pod_title');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-venue-v1');

    press('create-pod-venue-v1');
    fireEvent.changeText(screen.getByTestId('field-pod_date_time_text'), futureText);
    // Filling the end shows the live total-duration line (B3-8).
    fireEvent.changeText(screen.getByTestId('field-pod_end_date_time_text'), futureEndText);
    expect(screen.getByTestId('pod-duration')).toBeOnTheScreen();
    press('create-pod-submit');
    await screen.findByTestId('field-pod_description');
    fireEvent.changeText(screen.getByTestId('field-pod_description'), 'A relaxed hike.');
    fireEvent.changeText(screen.getByTestId('field-media_text'), 'https://cdn/img.jpg');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-offers-input');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-perks-input');
    press('create-pod-submit');
    await screen.findByTestId('products-enabled-toggle');
    press('products-enabled-toggle');
    press('products-enabled-toggle');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-type-NATIVE_FREE');
    // Toggle the price type to exercise the free-amount reset.
    press('create-pod-type-NATIVE_PAID');
    press('create-pod-type-NATIVE_FREE');

    press('create-pod-submit');
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    expect(onPublish.mock.calls[0]?.[0]).toBe('draft-1');
    expect(onPublish.mock.calls[0]?.[1].pod_title).toBe('Sunday community hike');
  });

  it('publishes a virtual pod (no venue, no place charges)', async () => {
    const { onPublish } = setup();
    await fillToStep7('VIRTUAL');
    expect(screen.queryByTestId('charge-add')).toBeNull();
    press('create-pod-submit');
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
    expect(onPublish.mock.calls[0]?.[1].venue_id).toBeNull();
  });

  it('blocks Next while the current step is invalid', async () => {
    setup();
    // Step 1: no location picked yet.
    press('create-pod-submit');
    await waitFor(() => expect(screen.getByTestId('create-pod-location-error')).toBeOnTheScreen());
    press('create-pod-location-l1');
    press('create-pod-submit');
    // Step 2: club details missing.
    await screen.findByTestId('field-pod_title');
    press('create-pod-submit');
    await waitFor(() => expect(screen.getByTestId('pod_title-error')).toBeOnTheScreen());
    expect(screen.getByTestId('create-pod-club-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-venue-v1')).toBeNull();
  });

  it('surfaces a publish error message', async () => {
    setup({ onPublish: jest.fn().mockRejectedValue(new Error('Server said no')) });
    await fillToStep7('PHYSICAL');
    press('create-pod-submit');
    await waitFor(() =>
      expect(screen.getByTestId('create-pod-error')).toHaveTextContent('Server said no'),
    );
  });

  it('falls back to a generic message for non-Error publish failures', async () => {
    setup({ onPublish: jest.fn().mockRejectedValue('nope') });
    await fillToStep7('PHYSICAL');
    press('create-pod-submit');
    await waitFor(() =>
      expect(screen.getByTestId('create-pod-error')).toHaveTextContent('Could not create the pod.'),
    );
  });

  it('shows a duplicate title inline, jumps to the title step and clears on edit (DIFF-1/7)', async () => {
    const message = 'A pod with this title already exists in this club. Choose a different title.';
    setup({ onPublish: jest.fn().mockRejectedValue(new Error(message)) });
    await fillToStep7('PHYSICAL');
    press('create-pod-submit');
    // Jumps back to the title step and shows the error inline on the title field.
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
    press('create-pod-location-l1');
    press('create-pod-submit');
    await screen.findByTestId('field-pod_title');
    fireEvent.changeText(screen.getByTestId('field-pod_title'), 'Sunday community hike');
    press('create-pod-club-c1');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-venue-v1');
  });

  it('autosaves the draft after the debounce window', () => {
    jest.useFakeTimers();
    try {
      const onSaveDraft = jest.fn().mockResolvedValue('draft-1');
      renderWithProviders(
        <CreatePodStepper
          initialValues={blankCreatePodForm}
          initialStep={1}
          initialDraftId={null}
          clubs={clubs}
          locations={locations}
          venueLocations={venueLocations}
          venues={venues}
          products={products}
          onSaveDraft={onSaveDraft}
          onPublish={jest.fn().mockResolvedValue(undefined)}
        />,
      );
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
    await fillToStep7('PHYSICAL');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-submit-spinner');
  });

  it('resumes at the provided step', () => {
    setup({ initialStep: 3, initialValues: { ...blankCreatePodForm, pod_title: 'Resumed' } });
    expect(screen.getByTestId('field-pod_description')).toBeOnTheScreen();
  });
});
