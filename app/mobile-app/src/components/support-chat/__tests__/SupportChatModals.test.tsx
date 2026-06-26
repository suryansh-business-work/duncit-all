import { fireEvent, screen } from '@testing-library/react-native';

import {
  EmailTranscriptModal,
  ReopenReasonModal,
  ResolveConfirmModal,
  SupportFeedbackModal,
  feedbackOption,
} from '@/components/support-chat/SupportChatModals';
import { renderWithProviders } from '@/utils/test-utils';

describe('ResolveConfirmModal', () => {
  it('renders nothing while closed', () => {
    renderWithProviders(
      <ResolveConfirmModal open={false} onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(screen.queryByTestId('resolve-confirm-modal')).toBeNull();
  });

  it('confirms, cancels and shows the busy label', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const { rerender } = renderWithProviders(
      <ResolveConfirmModal open onConfirm={onConfirm} onCancel={onCancel} />,
    );
    expect(screen.getByText('Mark as resolved?')).toBeOnTheScreen();
    expect(screen.getByText('Are you sure your issue has been resolved?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('resolve-confirm-yes'));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('resolve-confirm-cancel'));
    expect(onCancel).toHaveBeenCalled();

    rerender(<ResolveConfirmModal open busy onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByText('Resolving…')).toBeOnTheScreen();
  });
});

describe('SupportFeedbackModal', () => {
  it('renders nothing while closed', () => {
    renderWithProviders(
      <SupportFeedbackModal open={false} onSubmit={jest.fn()} onClose={jest.fn()} />,
    );
    expect(screen.queryByTestId('support-feedback-modal')).toBeNull();
  });

  it('marks submit disabled before a pick, then submits the rating + comment', () => {
    const onSubmit = jest.fn();
    renderWithProviders(<SupportFeedbackModal open onSubmit={onSubmit} onClose={jest.fn()} />);
    expect(screen.getByText('How did we do?')).toBeOnTheScreen();
    // The submit button is disabled until an emoji is picked.
    expect(screen.getByTestId('feedback-submit')).toHaveProp('aria-disabled', true);
    fireEvent.press(screen.getByTestId('feedback-emoji-3'));
    fireEvent.changeText(screen.getByTestId('feedback-comment'), 'Decent');
    fireEvent.press(screen.getByTestId('feedback-submit'));
    expect(onSubmit).toHaveBeenCalledWith(3, 'Decent');
  });

  it('shows the busy label and an error', () => {
    renderWithProviders(
      <SupportFeedbackModal
        open
        busy
        error="Already submitted"
        onSubmit={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Sending…')).toBeOnTheScreen();
    expect(screen.getByTestId('feedback-error')).toHaveTextContent('Already submitted');
  });

  it('skips via the Skip button', () => {
    const onClose = jest.fn();
    renderWithProviders(<SupportFeedbackModal open onSubmit={jest.fn()} onClose={onClose} />);
    fireEvent.press(screen.getByTestId('feedback-skip'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders the one-time read-only rating + comment instead of the form', () => {
    const onClose = jest.fn();
    renderWithProviders(
      <SupportFeedbackModal
        open
        rating={5}
        feedbackComment="Loved it"
        onSubmit={jest.fn()}
        onClose={onClose}
      />,
    );
    expect(screen.getByTestId('feedback-readonly')).toHaveTextContent(
      'Your rating: 😍 Very Satisfied',
    );
    expect(screen.getByTestId('feedback-readonly-comment')).toHaveTextContent('Loved it');
    expect(screen.queryByTestId('feedback-submit')).toBeNull();
    fireEvent.press(screen.getByTestId('feedback-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('omits the read-only comment line when none was left', () => {
    renderWithProviders(
      <SupportFeedbackModal open rating={2} onSubmit={jest.fn()} onClose={jest.fn()} />,
    );
    expect(screen.getByTestId('feedback-readonly')).toHaveTextContent(
      'Your rating: 🙁 Dissatisfied',
    );
    expect(screen.queryByTestId('feedback-readonly-comment')).toBeNull();
  });

  it('shows the thank-you once done, even when a prior rating exists', () => {
    const onClose = jest.fn();
    renderWithProviders(
      <SupportFeedbackModal open done rating={4} onSubmit={jest.fn()} onClose={onClose} />,
    );
    expect(screen.getByTestId('feedback-thanks')).toHaveTextContent(
      'Thank you for your feedback. Your feedback helps us improve the Duncit support experience.',
    );
    fireEvent.press(screen.getByTestId('feedback-done'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('feedbackOption', () => {
  it('maps a rating to its scale row, null when out of range', () => {
    expect(feedbackOption(1)).toEqual({ value: 1, emoji: '😠', label: 'Very Dissatisfied' });
    expect(feedbackOption(0)).toBeNull();
    expect(feedbackOption(null)).toBeNull();
  });
});

describe('ReopenReasonModal', () => {
  it('renders nothing while closed', () => {
    renderWithProviders(
      <ReopenReasonModal open={false} onSubmit={jest.fn()} onClose={jest.fn()} />,
    );
    expect(screen.queryByTestId('reopen-reason-modal')).toBeNull();
  });

  it('submits an optional (empty) reason and shows the deadline line', () => {
    const onSubmit = jest.fn();
    renderWithProviders(
      <ReopenReasonModal
        open
        deadlineLabel="07 Jul 2026, 06:30 PM"
        onSubmit={onSubmit}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByTestId('reopen-deadline')).toHaveTextContent(/07 Jul 2026, 06:30 PM/);
    // Reason is optional (B11) — submit works with an empty field.
    fireEvent.press(screen.getByTestId('reopen-submit'));
    expect(onSubmit).toHaveBeenCalledWith('');
    fireEvent.changeText(screen.getByTestId('reopen-reason-input'), 'Please reopen');
    fireEvent.press(screen.getByTestId('reopen-submit'));
    expect(onSubmit).toHaveBeenCalledWith('Please reopen');
  });

  it('omits the deadline/error lines when absent, closes on cancel, shows busy + error', () => {
    const onClose = jest.fn();
    const { rerender } = renderWithProviders(
      <ReopenReasonModal open onSubmit={jest.fn()} onClose={onClose} />,
    );
    expect(screen.queryByTestId('reopen-deadline')).toBeNull();
    expect(screen.queryByTestId('reopen-error')).toBeNull();
    fireEvent.press(screen.getByTestId('reopen-cancel'));
    expect(onClose).toHaveBeenCalled();

    rerender(
      <ReopenReasonModal open busy error="Window closed" onSubmit={jest.fn()} onClose={onClose} />,
    );
    expect(screen.getByTestId('reopen-error')).toHaveTextContent('Window closed');
    expect(screen.getByText('Re-opening…')).toBeOnTheScreen();
  });
});

describe('EmailTranscriptModal', () => {
  it('renders nothing while closed', () => {
    renderWithProviders(
      <EmailTranscriptModal open={false} onSend={jest.fn()} onClose={jest.fn()} />,
    );
    expect(screen.queryByTestId('support-email-modal')).toBeNull();
  });

  it('disables send for an empty email, sends a typed one, and shows busy', () => {
    const onSend = jest.fn();
    const { rerender } = renderWithProviders(
      <EmailTranscriptModal open onSend={onSend} onClose={jest.fn()} />,
    );
    expect(screen.getByTestId('email-send')).toHaveProp('aria-disabled', true);
    fireEvent.changeText(screen.getByTestId('email-input'), 'me@x.com');
    fireEvent.press(screen.getByTestId('email-send'));
    expect(onSend).toHaveBeenCalledWith('me@x.com');

    rerender(<EmailTranscriptModal open busy onSend={onSend} onClose={jest.fn()} />);
    expect(screen.getByText('Sending…')).toBeOnTheScreen();
  });

  it('shows the done + error states and closes', () => {
    const onClose = jest.fn();
    const { rerender } = renderWithProviders(
      <EmailTranscriptModal open done onSend={jest.fn()} onClose={onClose} />,
    );
    expect(screen.getByTestId('email-done')).toBeOnTheScreen();
    expect(screen.queryByTestId('email-send')).toBeNull();
    fireEvent.press(screen.getByTestId('email-close'));
    expect(onClose).toHaveBeenCalled();

    rerender(<EmailTranscriptModal open error="mail down" onSend={jest.fn()} onClose={onClose} />);
    expect(screen.getByTestId('email-error')).toHaveTextContent('mail down');
  });
});
