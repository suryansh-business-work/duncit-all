import { fireEvent, screen } from '@testing-library/react-native';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { renderWithProviders } from '@/utils/test-utils';

describe('ConfirmDialog', () => {
  it('renders the message + default labels and fires confirm', () => {
    const onConfirm = jest.fn();
    renderWithProviders(
      <ConfirmDialog
        open
        title="Sure?"
        message="Details here"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.getByText('Details here')).toBeOnTheScreen();
    expect(screen.getByText('Confirm')).toBeOnTheScreen();
    expect(screen.getByText('Cancel')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('renders without a message (destructive) and cancels via backdrop or button', () => {
    const onCancel = jest.fn();
    renderWithProviders(
      <ConfirmDialog
        open
        title="Delete?"
        destructive
        confirmLabel="Delete"
        cancelLabel="Keep"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByText('Delete')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Close'));
    fireEvent.press(screen.getByTestId('confirm-dialog-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
