import { fireEvent, screen } from '@testing-library/react-native';

import { StudioSwitchDialog } from '@/components/StudioSwitchDialog';
import { renderWithProviders } from '@/utils/test-utils';

describe('StudioSwitchDialog', () => {
  it('renders the available modes, highlights the current, and selects one', () => {
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
    expect(onSelect).toHaveBeenCalledWith('USER');
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
