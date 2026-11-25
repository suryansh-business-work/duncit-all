import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';
import { NoCrmAccessError, useAuthStore } from '@/stores/auth.store';
import { LoginScreen } from '../auth/LoginScreen';
import { TwoFactorScreen } from '../auth/TwoFactorScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));

/** Sign-in on the phone: the portal's rules and messages. */

const signIn = jest.fn();
const completeTwoFactor = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ status: 'signedOut', signIn, completeTwoFactor, challengeToken: 'ch' });
});

describe('LoginScreen', () => {
  it('signs in with the typed email and password', async () => {
    signIn.mockResolvedValue(undefined);
    renderWithTheme(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId('login-email'), ' asha@duncit.com ');
    fireEvent.changeText(screen.getByTestId('login-password'), 'longenough');
    fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith('asha@duncit.com', 'longenough'));
  });

  it('refuses a malformed address and a short password before asking the server', async () => {
    renderWithTheme(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId('login-email'), 'asha');
    fireEvent.changeText(screen.getByTestId('login-password'), 'short');
    fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByTestId('login-email-error')).toBeOnTheScreen();
    expect(screen.getByTestId('login-password-error')).toBeOnTheScreen();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('says plainly when the account has no CRM access', async () => {
    signIn.mockRejectedValue(new NoCrmAccessError());
    renderWithTheme(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId('login-email'), 'a@duncit.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'longenough');
    fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText(/does not have access to Duncit CRM/)).toBeOnTheScreen();
  });

  it('shows the server’s reason for any other failure', async () => {
    signIn.mockRejectedValue(new Error('Invalid email or password'));
    renderWithTheme(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId('login-email'), 'a@duncit.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'longenough');
    fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText('Invalid email or password')).toBeOnTheScreen();
  });

  it('shows and hides the password', () => {
    renderWithTheme(<LoginScreen />);
    expect(screen.getByTestId('login-password').props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByTestId('login-toggle-password'));
    expect(screen.getByTestId('login-password').props.secureTextEntry).toBe(false);
  });
});

describe('TwoFactorScreen', () => {
  it('sends a six-digit code', async () => {
    completeTwoFactor.mockResolvedValue(undefined);
    renderWithTheme(<TwoFactorScreen />);
    fireEvent.changeText(screen.getByTestId('two-factor-code'), '123456');
    fireEvent.press(screen.getByTestId('two-factor-submit'));
    await waitFor(() => expect(completeTwoFactor).toHaveBeenCalledWith('123456'));
  });

  it('refuses anything that is not six digits and shows a failed code', async () => {
    renderWithTheme(<TwoFactorScreen />);
    fireEvent.changeText(screen.getByTestId('two-factor-code'), '12');
    fireEvent.press(screen.getByTestId('two-factor-submit'));
    expect(await screen.findByText('Enter the 6-digit code')).toBeOnTheScreen();
    completeTwoFactor.mockRejectedValue(new Error('That code is not right'));
    fireEvent.changeText(screen.getByTestId('two-factor-code'), '654321');
    fireEvent.press(screen.getByTestId('two-factor-submit'));
    expect(await screen.findByText('That code is not right')).toBeOnTheScreen();
  });

  it('goes back to sign-in', () => {
    renderWithTheme(<TwoFactorScreen />);
    fireEvent.press(screen.getByTestId('two-factor-back'));
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedOut', challengeToken: null });
  });
});
