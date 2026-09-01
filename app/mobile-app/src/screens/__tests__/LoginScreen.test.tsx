import type { ReactNode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { LoginScreen } from '@/screens/LoginScreen';
import { login, loginWithGoogle } from '@/services/auth.service';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate }),
}));

const mockAuthenticate = jest.fn();
jest.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: { authenticate: jest.Mock }) => unknown) =>
    selector({ authenticate: mockAuthenticate }),
}));

jest.mock('@/services/auth.service');
jest.mock('@/components/password-recovery/RecoveryChannelStep', () => ({
  RecoveryChannelStep: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return <View testID="otp-channel-step" />;
  },
}));
jest.mock('@/components/AuthScaffold', () => ({
  AuthScaffold: ({ children, testID }: { children: ReactNode; testID?: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return <View testID={testID}>{children}</View>;
  },
}));
jest.mock('@/components/AuthAvatarsStrip', () => ({ AuthAvatarsStrip: () => null }));
jest.mock('@/components/AuthDivider', () => ({ AuthDivider: () => null }));
jest.mock('@/components/LegalLinks', () => ({ LegalLinks: () => null }));
jest.mock('@/components/GoogleAuthButton', () => ({
  GoogleAuthButton: ({ onIdToken }: { onIdToken: (t: string) => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID="google-btn" onPress={() => onIdToken('idtok')}>
        <Text>g</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/forms/login', () => ({
  LoginForm: ({ onSubmit }: { onSubmit: (v: { email: string; password: string }) => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable
        testID="submit-login"
        onPress={() => onSubmit({ email: 'a@b.com', password: 'pw' })}
      >
        <Text>l</Text>
      </Pressable>
    );
  },
}));

const mockedLogin = jest.mocked(login);
const mockedGoogle = jest.mocked(loginWithGoogle);

beforeEach(() => jest.clearAllMocks());

/**
 * Sign-in is a choice of method now, so the email/password form lives one step
 * in. Every password assertion below walks through the landing step first.
 */
function openPasswordStep() {
  fireEvent.press(screen.getByTestId('continue-with-password'));
}

describe('LoginScreen', () => {
  it('logs in and flips the auth gate', async () => {
    mockedLogin.mockResolvedValue({ token: 't', surveyCompleted: true });
    renderWithProviders(<LoginScreen />);
    openPasswordStep();
    fireEvent.press(screen.getByTestId('submit-login'));
    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalledWith('t', true));
  });

  it('authenticates via Google', async () => {
    mockedGoogle.mockResolvedValue({ token: 'g', surveyCompleted: false });
    renderWithProviders(<LoginScreen />);
    fireEvent.press(screen.getByTestId('google-btn'));
    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalledWith('g', false));
  });

  it('does not authenticate when login fails', async () => {
    const { ApiError } = jest.requireActual('@/utils/errors');
    mockedLogin.mockRejectedValue(new ApiError('bad creds'));
    renderWithProviders(<LoginScreen />);
    openPasswordStep();
    fireEvent.press(screen.getByTestId('submit-login'));
    await waitFor(() => expect(mockedLogin).toHaveBeenCalled());
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('does not authenticate when Google sign-in fails', async () => {
    mockedGoogle.mockRejectedValue(new Error('google down'));
    renderWithProviders(<LoginScreen />);
    fireEvent.press(screen.getByTestId('google-btn'));
    await waitFor(() => expect(mockedGoogle).toHaveBeenCalled());
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('navigates to signup', () => {
    renderWithProviders(<LoginScreen />);
    fireEvent.press(screen.getByTestId('go-signup'));
    expect(mockNavigate).toHaveBeenCalledWith('Signup');
  });

  it('navigates to forgot password', () => {
    renderWithProviders(<LoginScreen />);
    openPasswordStep();
    fireEvent.press(screen.getByTestId('go-forgot-password'));
    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('opens on the method chooser, and goes back to it from the password step', () => {
    renderWithProviders(<LoginScreen />);
    // The landing step offers the two methods; the boxes are one step in.
    expect(screen.queryByTestId('submit-login')).toBeNull();
    openPasswordStep();
    expect(screen.getByTestId('submit-login')).toBeTruthy();

    fireEvent.press(screen.getByTestId('back-to-options'));
    expect(screen.queryByTestId('submit-login')).toBeNull();
    expect(screen.getByTestId('continue-with-password')).toBeTruthy();
  });

  it('opens the OTP method and comes back to the options', () => {
    renderWithProviders(<LoginScreen />);
    fireEvent.press(screen.getByTestId('continue-with-otp'));
    expect(screen.getByTestId('otp-channel-step')).toBeTruthy();

    fireEvent.press(screen.getByTestId('otp-back'));
    expect(screen.getByTestId('continue-with-otp')).toBeTruthy();
  });

  it('shows the running app version footer', () => {
    renderWithProviders(<LoginScreen />);
    expect(screen.getByTestId('login-app-version')).toHaveTextContent(/App version/);
  });
});
