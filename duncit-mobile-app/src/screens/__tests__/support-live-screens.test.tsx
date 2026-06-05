import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { SosScreen } from '@/screens/SosScreen';
import { CallbackScreen } from '@/screens/CallbackScreen';
import { FeedbackScreen } from '@/screens/FeedbackScreen';
import { useSupportPods } from '@/hooks/useSupportPods';
import { useBouncer } from '@/hooks/useBouncer';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useSupportPods', () => ({ useSupportPods: jest.fn() }));
jest.mock('@/hooks/useBouncer', () => ({ useBouncer: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

const mockedPods = useSupportPods as jest.Mock;
const mockedBouncer = useBouncer as jest.Mock;

const pod = {
  membershipId: 'm1',
  podDocId: 'p1',
  podSlug: 's1',
  title: 'Pod 1',
  startsAt: '',
  endsAt: null,
};

const getActiveSos = jest.fn();
const raiseSos = jest.fn();
const requestCallback = jest.fn();
const submitFeedback = jest.fn();
const loadSupportTarget = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockedPods.mockReturnValue({
    options: [pod],
    selected: pod,
    selectedId: 'p1',
    setSelectedId: jest.fn(),
  });
  getActiveSos.mockResolvedValue(null);
  raiseSos.mockResolvedValue(undefined);
  requestCallback.mockResolvedValue(undefined);
  submitFeedback.mockResolvedValue(undefined);
  loadSupportTarget.mockResolvedValue({
    bouncerSupportTarget: { phone: '+91123', available: true },
  });
  mockedBouncer.mockReturnValue({
    loadSupportTarget,
    getActiveSos,
    raiseSos,
    requestCallback,
    submitFeedback,
  });
});

describe('SosScreen', () => {
  it('sends an SOS and then shows the active confirmation', async () => {
    getActiveSos.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 's1', status: 'OPEN' });
    renderWithProviders(<SosScreen />);
    fireEvent.changeText(screen.getByTestId('sos-message'), 'help');
    fireEvent.press(screen.getByTestId('sos-send'));
    await waitFor(() => expect(raiseSos).toHaveBeenCalledWith('p1', 'help'));
    await waitFor(() => expect(screen.getByTestId('sos-active')).toBeOnTheScreen());
  });

  it('surfaces an SOS error', async () => {
    raiseSos.mockRejectedValueOnce(new Error('no network'));
    renderWithProviders(<SosScreen />);
    fireEvent.press(screen.getByTestId('sos-send'));
    await waitFor(() => expect(screen.getByTestId('sos-error')).toHaveTextContent('no network'));
  });

  it('shows the active card when an SOS already exists', async () => {
    getActiveSos.mockResolvedValue({ id: 's1', status: 'ACKNOWLEDGED' });
    renderWithProviders(<SosScreen />);
    await waitFor(() => expect(screen.getByTestId('sos-active')).toBeOnTheScreen());
  });

  it('renders the form (no active fetch) when no pod is selected', () => {
    mockedPods.mockReturnValue({
      options: [],
      selected: null,
      selectedId: '',
      setSelectedId: jest.fn(),
    });
    renderWithProviders(<SosScreen />);
    expect(screen.getByTestId('sos-send')).toBeOnTheScreen();
    expect(getActiveSos).not.toHaveBeenCalled();
  });

  it('tolerates an active-SOS fetch failure on mount', async () => {
    getActiveSos.mockRejectedValue(new Error('offline'));
    renderWithProviders(<SosScreen />);
    await waitFor(() => expect(getActiveSos).toHaveBeenCalled());
    expect(screen.getByTestId('sos-send')).toBeOnTheScreen();
  });
});

describe('CallbackScreen', () => {
  it('calls support now and requests a callback', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    renderWithProviders(<CallbackScreen />);
    await waitFor(() => expect(loadSupportTarget).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('callback-call-now'));
    await waitFor(() => expect(openURL).toHaveBeenCalledWith('tel:+91123'));

    fireEvent.changeText(screen.getByTestId('callback-reason'), 'late host');
    fireEvent.press(screen.getByTestId('callback-request'));
    await waitFor(() => expect(requestCallback).toHaveBeenCalledWith('p1', 'late host'));
    await waitFor(() => expect(screen.getByTestId('callback-success')).toBeOnTheScreen());
  });

  it('surfaces a callback error', async () => {
    requestCallback.mockRejectedValueOnce(new Error('failed'));
    renderWithProviders(<CallbackScreen />);
    fireEvent.press(screen.getByTestId('callback-request'));
    await waitFor(() => expect(screen.getByTestId('callback-error')).toHaveTextContent('failed'));
  });

  it('tolerates a support-target fetch failure (call-now disabled)', async () => {
    loadSupportTarget.mockRejectedValueOnce(new Error('down'));
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    renderWithProviders(<CallbackScreen />);
    await waitFor(() => expect(loadSupportTarget).toHaveBeenCalled());
    fireEvent.press(screen.getByTestId('callback-call-now'));
    expect(openURL).not.toHaveBeenCalled();
  });
});

describe('FeedbackScreen', () => {
  it('requires a rating then submits', async () => {
    renderWithProviders(<FeedbackScreen />);
    fireEvent.press(screen.getByTestId('feedback-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('feedback-error')).toHaveTextContent(/star rating/),
    );

    fireEvent.press(screen.getByTestId('rating-star-5'));
    fireEvent.press(screen.getByTestId('feedback-cat-HOST'));
    fireEvent.changeText(screen.getByTestId('feedback-message'), 'great');
    fireEvent.press(screen.getByTestId('feedback-submit'));
    await waitFor(() => expect(submitFeedback).toHaveBeenCalledWith('p1', 5, 'HOST', 'great'));
    await waitFor(() => expect(screen.getByTestId('feedback-success')).toBeOnTheScreen());
  });

  it('surfaces a submit error', async () => {
    submitFeedback.mockRejectedValueOnce(new Error('server busy'));
    renderWithProviders(<FeedbackScreen />);
    fireEvent.press(screen.getByTestId('rating-star-3'));
    fireEvent.press(screen.getByTestId('feedback-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('feedback-error')).toHaveTextContent(/server busy/),
    );
  });

  it('asks to pick a pod when none is selected', async () => {
    mockedPods.mockReturnValue({
      options: [],
      selected: null,
      selectedId: '',
      setSelectedId: jest.fn(),
    });
    renderWithProviders(<FeedbackScreen />);
    fireEvent.press(screen.getByTestId('feedback-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('feedback-error')).toHaveTextContent(/Pick a pod/),
    );
  });
});
