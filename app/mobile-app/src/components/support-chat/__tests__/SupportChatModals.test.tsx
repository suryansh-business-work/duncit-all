import { fireEvent, screen } from '@testing-library/react-native';

import { ReopenReasonModal } from '@/components/support-chat/SupportChatModals';
import { renderWithProviders } from '@/utils/test-utils';

describe('ReopenReasonModal', () => {
  it('renders nothing while closed', () => {
    renderWithProviders(
      <ReopenReasonModal open={false} onSubmit={jest.fn()} onClose={jest.fn()} />,
    );
    expect(screen.queryByTestId('reopen-reason-modal')).toBeNull();
  });

  it('shows the deadline line and submits a typed reason', () => {
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
    fireEvent.changeText(screen.getByTestId('reopen-reason-input'), 'Please reopen');
    fireEvent.press(screen.getByTestId('reopen-submit'));
    expect(onSubmit).toHaveBeenCalledWith('Please reopen');
  });

  it('omits the deadline line and the error when not provided, and closes on cancel', () => {
    const onClose = jest.fn();
    renderWithProviders(<ReopenReasonModal open onSubmit={jest.fn()} onClose={onClose} />);
    expect(screen.queryByTestId('reopen-deadline')).toBeNull();
    expect(screen.queryByTestId('reopen-error')).toBeNull();
    fireEvent.press(screen.getByTestId('reopen-cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('surfaces an error and shows the busy label', () => {
    renderWithProviders(
      <ReopenReasonModal
        open
        busy
        error="Window closed"
        onSubmit={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByTestId('reopen-error')).toHaveTextContent('Window closed');
    expect(screen.getByText('Re-opening…')).toBeOnTheScreen();
  });
});
