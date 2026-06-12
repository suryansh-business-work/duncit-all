import { fireEvent, screen } from '@testing-library/react-native';

import { DraftDeleteConfirm } from '@/components/host-manage/DraftDeleteConfirm';
import { renderWithProviders } from '@/utils/test-utils';

describe('DraftDeleteConfirm', () => {
  it('fires cancel and confirm when idle', () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    renderWithProviders(
      <DraftDeleteConfirm open busy={false} onCancel={onCancel} onConfirm={onConfirm} />,
    );
    fireEvent.press(screen.getByTestId('draft-delete-cancel'));
    expect(onCancel).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('draft-delete-confirm-btn'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('disables the actions while busy', () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    renderWithProviders(<DraftDeleteConfirm open busy onCancel={onCancel} onConfirm={onConfirm} />);
    expect(screen.getByText('Deleting…')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('draft-delete-confirm-btn'));
    fireEvent.press(screen.getByTestId('draft-delete-cancel'));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
