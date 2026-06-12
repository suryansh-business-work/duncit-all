import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CreatePodStepper } from '@/components/create-pod/CreatePodStepper';
import { blankCreatePodForm } from '@/components/create-pod/create-pod.types';
import { renderWithProviders } from '@/utils/test-utils';

const futureText = (() => {
  const date = new Date(Date.now() + 24 * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
})();

const clubs = [{ id: 'c1', club_name: 'Runners', meetup_venues_id: ['v1'] }];
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

// Drives steps 1→7. Physical picks a venue; virtual fills the meeting link.
async function fillToStep7(mode: 'PHYSICAL' | 'VIRTUAL') {
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

    fireEvent.changeText(screen.getByTestId('field-pod_title'), 'Sunday community hike');
    press('create-pod-club-c1');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-venue-v1');
    // Back returns to step 1, then forward again.
    press('create-pod-back');
    await screen.findByTestId('field-pod_title');
    press('create-pod-submit');
    await screen.findByTestId('create-pod-venue-v1');

    press('create-pod-venue-v1');
    fireEvent.changeText(screen.getByTestId('field-pod_date_time_text'), futureText);
    press('create-pod-submit');
    await screen.findByTestId('field-pod_description');
    fireEvent.changeText(screen.getByTestId('field-pod_description'), 'A relaxed hike.');
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

  it('keeps navigating even when a draft autosave fails', async () => {
    setup({ onSaveDraft: jest.fn().mockRejectedValue(new Error('save failed')) });
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
          initialStep={0}
          initialDraftId={null}
          clubs={clubs}
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
    setup({ initialStep: 2, initialValues: { ...blankCreatePodForm, pod_title: 'Resumed' } });
    expect(screen.getByTestId('field-pod_description')).toBeOnTheScreen();
  });
});
