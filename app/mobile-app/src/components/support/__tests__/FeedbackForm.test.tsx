import { fireEvent, screen } from '@testing-library/react-native';

import { FeedbackForm } from '@/components/support/FeedbackForm';
import { renderWithProviders } from '@/utils/test-utils';

describe('FeedbackForm', () => {
  it('submits the default category with a trimmed, valid message', () => {
    const onSubmit = jest.fn();
    renderWithProviders(<FeedbackForm onSubmit={onSubmit} />);
    fireEvent.changeText(screen.getByTestId('feedback-message'), '  the app keeps crashing  ');
    fireEvent.press(screen.getByTestId('feedback-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ category: 'Bug', message: 'the app keeps crashing' });
  });

  it('blocks a too-short message and shows the hint error', () => {
    const onSubmit = jest.fn();
    renderWithProviders(<FeedbackForm onSubmit={onSubmit} />);
    fireEvent.changeText(screen.getByTestId('feedback-message'), 'short');
    fireEvent.press(screen.getByTestId('feedback-submit'));
    expect(screen.getByTestId('feedback-error')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('lets the user pick a different category', () => {
    const onSubmit = jest.fn();
    renderWithProviders(<FeedbackForm onSubmit={onSubmit} />);
    fireEvent.press(screen.getByTestId('feedback-cat-Idea'));
    fireEvent.changeText(screen.getByTestId('feedback-message'), 'please add dark mode support');
    fireEvent.press(screen.getByTestId('feedback-submit'));
    expect(onSubmit).toHaveBeenCalledWith({
      category: 'Idea',
      message: 'please add dark mode support',
    });
  });

  it('shows the submitting state and a passed-in error message', () => {
    renderWithProviders(
      <FeedbackForm submitting errorMessage="server unavailable" onSubmit={jest.fn()} />,
    );
    expect(screen.getByText('Sending…')).toBeOnTheScreen();
    expect(screen.getByText('server unavailable')).toBeOnTheScreen();
  });
});
