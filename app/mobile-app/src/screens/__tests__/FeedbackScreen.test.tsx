import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { FeedbackScreen } from '@/screens/FeedbackScreen';
import { renderWithProviders } from '@/utils/test-utils';
import { submitAppFeedback } from '@/hooks/useFeedback';

jest.mock('@/hooks/useFeedback', () => ({ submitAppFeedback: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: jest.fn(), goBack: jest.fn() }),
}));
const mockSubmit = submitAppFeedback as jest.Mock;

const fillAndSend = () => {
  fireEvent.changeText(screen.getByTestId('feedback-message'), 'the checkout button does nothing');
  fireEvent.press(screen.getByTestId('feedback-submit'));
};

describe('FeedbackScreen', () => {
  beforeEach(() => mockSubmit.mockReset());

  it('sends feedback and shows the thank-you state', async () => {
    mockSubmit.mockResolvedValue({ submitAppFeedback: { ok: true, channel: 'C', ts: '1' } });
    renderWithProviders(<FeedbackScreen />);
    fillAndSend();
    await waitFor(() => expect(screen.getByTestId('feedback-sent')).toBeOnTheScreen());
    expect(mockSubmit).toHaveBeenCalledWith('Bug', 'the checkout button does nothing');
  });

  it('surfaces a thrown Error without confirming success', async () => {
    mockSubmit.mockRejectedValue(new Error('No Slack channel is configured'));
    renderWithProviders(<FeedbackScreen />);
    fillAndSend();
    await waitFor(() =>
      expect(screen.getByText('No Slack channel is configured')).toBeOnTheScreen(),
    );
    expect(screen.queryByTestId('feedback-sent')).toBeNull();
  });

  it('falls back to a default message for a non-Error rejection', async () => {
    mockSubmit.mockRejectedValue('boom');
    renderWithProviders(<FeedbackScreen />);
    fillAndSend();
    await waitFor(() => expect(screen.getByText(/Could not send feedback/)).toBeOnTheScreen());
  });
});
