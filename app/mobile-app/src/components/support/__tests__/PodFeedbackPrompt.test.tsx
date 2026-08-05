import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodFeedbackPrompt } from '@/components/support/PodFeedbackPrompt';
import { useBouncer } from '@/hooks/useBouncer';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useBouncer', () => ({ useBouncer: jest.fn() }));
const mockedBouncer = useBouncer as jest.Mock;
const getPendingPodFeedback = jest.fn();
const submitPodFeedback = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  submitPodFeedback.mockResolvedValue(undefined);
  mockedBouncer.mockReturnValue({ getPendingPodFeedback, submitPodFeedback });
});

describe('PodFeedbackPrompt', () => {
  it('renders nothing when no pod is pending (and swallows failures)', async () => {
    getPendingPodFeedback.mockResolvedValue(null);
    const a = renderWithProviders(<PodFeedbackPrompt />);
    await waitFor(() => expect(getPendingPodFeedback).toHaveBeenCalled());
    expect(screen.queryByTestId('pod-feedback-prompt')).toBeNull();
    a.unmount();

    getPendingPodFeedback.mockRejectedValue(new Error('offline'));
    renderWithProviders(<PodFeedbackPrompt />);
    await waitFor(() => expect(getPendingPodFeedback).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('pod-feedback-prompt')).toBeNull();
  });

  it('ignores a pod that resolves after unmount', async () => {
    let resolvePod: (v: unknown) => void = () => undefined;
    getPendingPodFeedback.mockReturnValue(
      new Promise((resolve) => {
        resolvePod = resolve;
      }),
    );
    const { unmount } = renderWithProviders(<PodFeedbackPrompt />);
    unmount();
    await act(async () => {
      resolvePod({ id: 'p1', title: 'X' });
      await Promise.resolve();
    });
    expect(getPendingPodFeedback).toHaveBeenCalled();
  });

  it('dismisses on "Not now"', async () => {
    getPendingPodFeedback.mockResolvedValue({ id: 'p1', title: 'Past Pod' });
    renderWithProviders(<PodFeedbackPrompt />);
    await waitFor(() => expect(screen.getByTestId('pod-feedback-prompt')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('pod-feedback-skip'));
    expect(screen.queryByTestId('pod-feedback-prompt')).toBeNull();
  });

  it('requires the overall rating before submit, then sends every scored aspect', async () => {
    getPendingPodFeedback.mockResolvedValue({
      id: 'p1',
      title: 'Past Pod',
      feedback_aspects: ['OVERALL', 'HOST', 'SAFETY', 'OTHER'],
    });
    let resolveSubmit: () => void = () => undefined;
    submitPodFeedback.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    renderWithProviders(<PodFeedbackPrompt />);
    await waitFor(() => expect(screen.getByTestId('pod-feedback-prompt')).toBeOnTheScreen());

    // Disabled without a rating.
    fireEvent.press(screen.getByTestId('pod-feedback-submit'));
    expect(submitPodFeedback).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('pod-feedback-OVERALL-star-3'));
    fireEvent.press(screen.getByTestId('pod-feedback-HOST-star-5'));
    fireEvent.changeText(screen.getByTestId('pod-feedback-comment'), 'Great vibe');
    fireEvent.press(screen.getByTestId('pod-feedback-submit'));
    expect(screen.getByTestId('pod-feedback-submit')).toHaveTextContent('Sending…');
    // The overall score travels on `rating`; an aspect nobody scored is absent
    // rather than sent as a zero.
    expect(submitPodFeedback).toHaveBeenCalledWith({
      pod_id: 'p1',
      rating: 3,
      message: 'Great vibe',
      ratings: [{ aspect: 'HOST', rating: 5 }],
    });

    await act(async () => {
      resolveSubmit();
      await Promise.resolve();
    });
    expect(screen.queryByTestId('pod-feedback-prompt')).toBeNull();
  });
});
