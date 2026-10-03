import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodFeedbackScreen } from '@/screens/PodFeedbackScreen';
import { useBouncer } from '@/hooks/useBouncer';
import { fallbackT } from '@/i18n/fallback';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useBouncer', () => ({ useBouncer: jest.fn() }));

const mockGoBack = jest.fn();
let mockParams: { podId?: string } | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({ params: mockParams }),
}));

const mockedBouncer = useBouncer as jest.Mock;
const getPodFeedbackForm = jest.fn();
const submitPodFeedback = jest.fn();

const form = (over: Record<string, unknown> = {}) => ({
  pod: { id: 'p1', title: 'Sunset Jam', feedback_aspects: ['HOST'] },
  can_rate: true,
  mine: null,
  ...over,
});

const mine = {
  rating: 3,
  ratings: [{ aspect: 'HOST', rating: 2 }],
  message: 'It was fine',
  updated_at: '2030-01-01T00:00:00.000Z',
};

const isDisabled = (testID: string) => {
  const node = screen.getByTestId(testID);
  return node.props.accessibilityState?.disabled === true || node.props['aria-disabled'] === true;
};

const isChecked = (testID: string) => {
  const node = screen.getByTestId(testID);
  return node.props.accessibilityState?.checked === true || node.props['aria-checked'] === true;
};

async function loaded(data: unknown) {
  getPodFeedbackForm.mockResolvedValueOnce(data);
  renderWithProviders(<PodFeedbackScreen />);
  await waitFor(() => expect(screen.queryByTestId('pod-feedback-loading')).toBeNull());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { podId: 'p1' };
  // Stable references: the screen re-reads the form whenever the loader changes.
  mockedBouncer.mockReturnValue({ getPodFeedbackForm, submitPodFeedback });
});

describe('PodFeedbackScreen — loading', () => {
  it('shows the spinner, then the form for the pod in the link', async () => {
    getPodFeedbackForm.mockResolvedValueOnce(form());
    renderWithProviders(<PodFeedbackScreen />);
    expect(screen.getByTestId('pod-feedback-loading')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId('pod-feedback-submit')).toBeOnTheScreen());
    expect(getPodFeedbackForm).toHaveBeenCalledWith('p1');
    expect(screen.queryByTestId('pod-feedback-already-rated')).toBeNull();
    // Nothing scored yet: the one required question is unanswered.
    expect(isDisabled('pod-feedback-submit')).toBe(true);
  });

  it('asks with an empty id when the link carries no pod', async () => {
    mockParams = undefined;
    await loaded(form());
    expect(getPodFeedbackForm).toHaveBeenCalledWith('');
  });

  it('tells a guest who was not marked present why they cannot rate', async () => {
    await loaded(form({ can_rate: false }));
    expect(screen.getByTestId('pod-feedback-no-access')).toHaveTextContent(
      fallbackT('mweb.podFeedback.noAccess'),
    );
    expect(screen.queryByTestId('pod-feedback-submit')).toBeNull();
  });

  it('shows the load error when the form cannot be read', async () => {
    getPodFeedbackForm.mockRejectedValueOnce(new Error('down'));
    renderWithProviders(<PodFeedbackScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('pod-feedback-load-error')).toHaveTextContent(
        fallbackT('mweb.podFeedback.loadFailed'),
      ),
    );
  });

  it('ignores a form that lands after the screen is gone', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    getPodFeedbackForm.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderWithProviders(<PodFeedbackScreen />);
    unmount();
    await act(async () => resolve(form()));
    expect(screen.queryByTestId('pod-feedback-submit')).toBeNull();
  });
});

describe('PodFeedbackScreen — rating', () => {
  it('submits the scores and comment, then confirms', async () => {
    submitPodFeedback.mockResolvedValueOnce(undefined);
    await loaded(form());
    fireEvent.press(screen.getByTestId('pod-feedback-OVERALL-star-4'));
    fireEvent.press(screen.getByTestId('pod-feedback-HOST-star-5'));
    fireEvent.changeText(screen.getByTestId('pod-feedback-comment'), '  Great host  ');
    expect(isDisabled('pod-feedback-submit')).toBe(false);

    fireEvent.press(screen.getByTestId('pod-feedback-submit'));
    await waitFor(() => expect(screen.getByTestId('pod-feedback-saved')).toBeOnTheScreen());
    expect(submitPodFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        pod_id: 'p1',
        rating: 4,
        message: 'Great host',
        ratings: [{ aspect: 'HOST', rating: 5 }],
      }),
    );
    // Saved this visit: the form now offers an update, not a second submit.
    expect(screen.getByTestId('pod-feedback-already-rated')).toBeOnTheScreen();
  });

  it('an edit after saving clears the saved notice', async () => {
    submitPodFeedback.mockResolvedValue(undefined);
    await loaded(form());
    fireEvent.press(screen.getByTestId('pod-feedback-OVERALL-star-5'));
    fireEvent.press(screen.getByTestId('pod-feedback-submit'));
    await waitFor(() => expect(screen.getByTestId('pod-feedback-saved')).toBeOnTheScreen());

    fireEvent.changeText(screen.getByTestId('pod-feedback-comment'), 'More to say');
    expect(screen.queryByTestId('pod-feedback-saved')).toBeNull();

    fireEvent.press(screen.getByTestId('pod-feedback-submit'));
    await waitFor(() => expect(screen.getByTestId('pod-feedback-saved')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('pod-feedback-OVERALL-star-2'));
    expect(screen.queryByTestId('pod-feedback-saved')).toBeNull();
  });

  it('opens on the guest’s own answers and edits that rating', async () => {
    submitPodFeedback.mockResolvedValueOnce(undefined);
    await loaded(form({ mine }));
    expect(screen.getByTestId('pod-feedback-already-rated')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-feedback-comment').props.value).toBe('It was fine');
    expect(isChecked('pod-feedback-OVERALL-star-3')).toBe(true);

    fireEvent.press(screen.getByTestId('pod-feedback-submit'));
    await waitFor(() => expect(submitPodFeedback).toHaveBeenCalledTimes(1));
    expect(submitPodFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        rating: 3,
        message: 'It was fine',
        ratings: [{ aspect: 'HOST', rating: 2 }],
      }),
    );
  });

  it('keeps a stored rating with no comment as an empty box', async () => {
    await loaded(form({ mine: { ...mine, message: null } }));
    expect(screen.getByTestId('pod-feedback-comment').props.value).toBe('');
  });

  it('keeps the answers and says so when the save fails', async () => {
    submitPodFeedback.mockRejectedValueOnce(new Error('down'));
    await loaded(form());
    fireEvent.press(screen.getByTestId('pod-feedback-OVERALL-star-4'));
    fireEvent.press(screen.getByTestId('pod-feedback-submit'));
    await waitFor(() => expect(screen.getByTestId('pod-feedback-error')).toBeOnTheScreen());
    expect(screen.queryByTestId('pod-feedback-saved')).toBeNull();
    expect(isChecked('pod-feedback-OVERALL-star-4')).toBe(true);
  });

  it('leaves through the back navigation', async () => {
    await loaded(form());
    fireEvent.press(screen.getByTestId('pod-feedback-skip'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
