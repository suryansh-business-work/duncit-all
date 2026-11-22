import { fireEvent, screen, userEvent } from '@testing-library/react-native';

import { StudioSwitchDialog } from '@/components/StudioSwitchDialog';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
// `me.is_email_verified` — false keeps Host, Venue and Club Admin shut.
let mockEmailVerified: boolean | null = true;
jest.mock('@/hooks/useMe', () => ({
  useMe: () => ({ data: { me: { is_email_verified: mockEmailVerified } } }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockEmailVerified = true;
});

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

  it('keeps the Switch button disabled while the current role is still the pick', async () => {
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
    // userEvent presses the way a finger does — only through host views — so a
    // disabled button that drops its handler cannot be reached through the
    // component's own props, which fireEvent would walk into.
    await userEvent.setup().press(confirm);
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

  it.each(['HOST', 'VENUE', 'CLUB'] as const)(
    'says "verify your email first" for %s on an unverified email and offers to verify instead of switching',
    (mode) => {
      mockEmailVerified = false;
      const onSelect = jest.fn();
      const onClose = jest.fn();
      renderWithProviders(
        <StudioSwitchDialog
          open
          roles={['HOST', 'VENUE_OWNER', 'CLUB_ADMIN']}
          current="USER"
          onClose={onClose}
          onSelect={onSelect}
        />,
      );
      expect(screen.queryByTestId('studio-switch-email-gate')).toBeNull();
      fireEvent.press(screen.getByTestId(`studio-switch-${mode}`));
      expect(screen.getByTestId('studio-switch-email-gate')).toHaveTextContent(/Verify your email first/);
      const confirm = screen.getByTestId('studio-switch-confirm');
      expect(confirm).toHaveTextContent('Verify email');
      fireEvent.press(confirm);
      expect(onSelect).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('Profile', { verifyEmail: true });
    },
  );

  it('still switches into the Brand studio and User mode on an unverified email', () => {
    mockEmailVerified = false;
    const onSelect = jest.fn();
    renderWithProviders(
      <StudioSwitchDialog
        open
        roles={['HOST', 'ECOMM_MANAGER']}
        current="HOST"
        onClose={jest.fn()}
        onSelect={onSelect}
      />,
    );
    // The remembered Host mode is itself shut, so the dialog opens saying so.
    expect(screen.getByTestId('studio-switch-email-gate')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('studio-switch-ECOMM'));
    expect(screen.queryByTestId('studio-switch-email-gate')).toBeNull();
    fireEvent.press(screen.getByTestId('studio-switch-confirm'));
    expect(onSelect).toHaveBeenLastCalledWith('ECOMM');
    fireEvent.press(screen.getByTestId('studio-switch-USER'));
    fireEvent.press(screen.getByTestId('studio-switch-confirm'));
    expect(onSelect).toHaveBeenLastCalledWith('USER');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
