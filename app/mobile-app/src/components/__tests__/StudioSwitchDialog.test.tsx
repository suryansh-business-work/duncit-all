import { fireEvent, screen } from '@testing-library/react-native';

import { StudioSwitchDialog } from '@/components/StudioSwitchDialog';
import { renderWithProviders } from '@/utils/test-utils';

describe('StudioSwitchDialog', () => {
  it('stages a bubble and only switches once the Switch button is pressed', () => {
    const onSelect = jest.fn();
    renderWithProviders(
      <StudioSwitchDialog
        open
        roles={['HOST', 'VENUE_OWNER', 'ECOMM_MANAGER']}
        current="ECOMM"
        onClose={jest.fn()}
        onSelect={onSelect}
      />,
    );
    ['USER', 'HOST', 'VENUE', 'ECOMM'].forEach((mode) =>
      expect(screen.getByTestId(`studio-switch-${mode}`)).toBeOnTheScreen(),
    );
    fireEvent.press(screen.getByTestId('studio-switch-USER'));
    // Picking a bubble stages the choice — nothing has switched yet.
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText('Selected — press Switch to confirm')).toBeOnTheScreen();
    const confirm = screen.getByTestId('studio-switch-confirm');
    expect(confirm).toHaveTextContent('Switch to User');
    fireEvent.press(confirm);
    expect(onSelect).toHaveBeenCalledWith('USER');
  });

  it('keeps the Switch button disabled while the current role is still the pick', () => {
    const onSelect = jest.fn();
    renderWithProviders(
      <StudioSwitchDialog
        open
        roles={['HOST', 'VENUE_OWNER']}
        current="HOST"
        onClose={jest.fn()}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText('Active right now')).toBeOnTheScreen();
    const confirm = screen.getByTestId('studio-switch-confirm');
    expect(confirm).toHaveTextContent('Switch');
    expect(confirm).toBeDisabled();
    fireEvent.press(confirm);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('limits the options to the modes the user qualifies for', () => {
    renderWithProviders(
      <StudioSwitchDialog
        open
        roles={['HOST']}
        current="HOST"
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByTestId('studio-switch-HOST')).toBeOnTheScreen();
    expect(screen.queryByTestId('studio-switch-VENUE')).toBeNull();
    expect(screen.queryByTestId('studio-switch-ECOMM')).toBeNull();
  });
});
