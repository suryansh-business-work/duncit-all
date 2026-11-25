import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { gqlRequest } from '@/services/graphql.client';
import { useAppearanceStore } from '@/stores/appearance.store';

import { renderWithTheme } from '@/test-utils';
import { NoCrmAccessError, useAuthStore } from '@/stores/auth.store';
import { LoginScreen } from '../auth/LoginScreen';
import { TwoFactorScreen } from '../auth/TwoFactorScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));

/** Sign-in on the phone: the portal's rules and messages. */

const signIn = jest.fn();
const completeTwoFactor = jest.fn();
const requestLoginCode = jest.fn();
const signInWithCode = jest.fn();
const branding = {
  terms_url: 'https://duncit.com/terms',
  privacy_url: 'https://duncit.com/privacy',
  support_email: 'help@duncit.com',
};

beforeEach(() => {
  jest.clearAllMocks();
  (gqlRequest as jest.Mock).mockResolvedValue({ branding });
  useAuthStore.setState({
    status: 'signedOut',
    signIn,
    completeTwoFactor,
    requestLoginCode,
    signInWithCode,
    challengeToken: 'ch',
  });
});

describe('LoginScreen', () => {
  it('signs in with the typed email and password', async () => {
    signIn.mockResolvedValue(undefined);
    renderWithTheme(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId('login-email'), ' asha@duncit.com ');
    // The console sets no password length floor — the portal accepts this too.
    fireEvent.changeText(screen.getByTestId('login-password'), 'pw');
    fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith('asha@duncit.com', 'pw'));
  });

  it('refuses a malformed address and an empty password with the portal messages', async () => {
    renderWithTheme(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId('login-email'), 'asha');
    fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText('Enter a valid e-mail address')).toBeOnTheScreen();
    expect(screen.getByText('Password is required')).toBeOnTheScreen();
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

describe('LoginScreen — the portal login card', () => {
  it('tells how to reset a forgotten password', () => {
    renderWithTheme(<LoginScreen />);
    fireEvent.press(screen.getByTestId('go-forgot-password'));
    expect(screen.getByTestId('forgot-password-hint')).toHaveTextContent(
      'Contact your administrator to reset your password.',
    );
  });

  it('shows Admin Branding’s privacy, terms and support address, and opens them', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderWithTheme(<LoginScreen />);
    fireEvent.press(await screen.findByTestId('login-privacy-link'));
    expect(openURL).toHaveBeenCalledWith('https://duncit.com/privacy');
    fireEvent.press(screen.getByTestId('login-terms-link'));
    expect(openURL).toHaveBeenCalledWith('https://duncit.com/terms');
    fireEvent.press(screen.getByTestId('login-support-email'));
    expect(openURL).toHaveBeenCalledWith('mailto:help@duncit.com');
  });

  it('switches light and dark, and remembers the choice', () => {
    useAppearanceStore.setState({ mode: 'light' });
    renderWithTheme(<LoginScreen />);
    fireEvent.press(screen.getByTestId('login-color-mode'));
    expect(useAppearanceStore.getState().mode).toBe('dark');
  });
});

describe('LoginScreen — sign in with an emailed code', () => {
  const openCodeForm = () => {
    renderWithTheme(<LoginScreen />);
    fireEvent.press(screen.getByTestId('continue-with-otp'));
  };

  it('emails a code, never saying whether the account exists, then signs in with it', async () => {
    requestLoginCode.mockResolvedValue(undefined);
    signInWithCode.mockResolvedValue(undefined);
    openCodeForm();
    fireEvent.changeText(screen.getByTestId('otp-login-email'), ' asha@duncit.com ');
    await act(async () => fireEvent.press(screen.getByTestId('otp-send-code')));
    expect(requestLoginCode).toHaveBeenCalledWith('asha@duncit.com');
    expect(screen.getByTestId('otp-login-code-sent')).toHaveTextContent(
      /If that address can sign in here/,
    );
    fireEvent.changeText(screen.getByTestId('field-otp'), '123456');
    await act(async () => fireEvent.press(screen.getByTestId('otp-verify-code')));
    expect(signInWithCode).toHaveBeenCalledWith('asha@duncit.com', '123456');
  });

  it('refuses a malformed address and a short code before asking the server', async () => {
    requestLoginCode.mockResolvedValue(undefined);
    openCodeForm();
    fireEvent.changeText(screen.getByTestId('otp-login-email'), 'asha');
    await act(async () => fireEvent.press(screen.getByTestId('otp-send-code')));
    expect(screen.getByText('Enter a valid e-mail address')).toBeOnTheScreen();
    expect(requestLoginCode).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByTestId('otp-login-email'), 'asha@duncit.com');
    await act(async () => fireEvent.press(screen.getByTestId('otp-send-code')));
    fireEvent.changeText(screen.getByTestId('field-otp'), '12');
    await act(async () => fireEvent.press(screen.getByTestId('otp-verify-code')));
    expect(screen.getByText('Enter the 6-digit code')).toBeOnTheScreen();
    expect(signInWithCode).not.toHaveBeenCalled();
  });

  it('stays on the address when the code could not be sent, and shows why', async () => {
    requestLoginCode.mockRejectedValue(new Error('Too many codes requested. Try again later.'));
    openCodeForm();
    fireEvent.changeText(screen.getByTestId('otp-login-email'), 'asha@duncit.com');
    await act(async () => fireEvent.press(screen.getByTestId('otp-send-code')));
    expect(screen.getByTestId('otp-login-error')).toHaveTextContent(
      /Too many codes requested. Try again later./,
    );
    expect(screen.queryByTestId('field-otp')).toBeNull();
  });

  it('shows a refused code, offers another address, and goes back to the password', async () => {
    requestLoginCode.mockResolvedValue(undefined);
    signInWithCode.mockRejectedValue(new NoCrmAccessError());
    openCodeForm();
    fireEvent.changeText(screen.getByTestId('otp-login-email'), 'asha@duncit.com');
    await act(async () => fireEvent.press(screen.getByTestId('otp-send-code')));
    fireEvent.changeText(screen.getByTestId('field-otp'), '123456');
    await act(async () => fireEvent.press(screen.getByTestId('otp-verify-code')));
    expect(screen.getByTestId('otp-login-error')).toHaveTextContent(
      /does not have access to Duncit CRM/,
    );
    fireEvent.press(screen.getByTestId('otp-different-address'));
    expect(screen.getByTestId('otp-login-email')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('otp-login-use-password'));
    expect(screen.getByTestId('continue-with-otp')).toBeOnTheScreen();
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
