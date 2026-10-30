import type { ReactNode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { LoginScreen } from '@/screens/LoginScreen';
import { login, loginWithGoogle } from '@/services/auth.service';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockGoBack = jest.fn();
const mockReplace = jest.fn();
let mockRouteParams: Record<string, unknown> | undefined;
let mockStackRoutes: { name: string }[] = [{ name: 'Login' }];
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    canGoBack: () => true,
    navigate: mockNavigate,
    push: mockPush,
    goBack: mockGoBack,
    replace: mockReplace,
    getState: () => ({ routes: mockStackRoutes }),
  }),
  useRoute: () => ({ params: mockRouteParams }),
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
  LoginForm: ({
    onSubmit,
    onForgotPassword,
  }: {
    onSubmit: (v: { email: string; password: string }) => void;
    onForgotPassword: (h: unknown) => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text, View } = require('react-native');
    return (
      <View>
        <Pressable
          testID="submit-login"
          onPress={() => onSubmit({ email: 'a@b.com', password: 'pw' })}
        >
          <Text>l</Text>
        </Pressable>
        <Pressable testID="go-forgot-password" onPress={() => onForgotPassword(mockHandoff)}>
          <Text>f</Text>
        </Pressable>
      </View>
    );
  },
}));

const mockedLogin = jest.mocked(login);
const mockedGoogle = jest.mocked(loginWithGoogle);

const mockHandoff = {
  channel: 'PHONE',
  draft: { email: '', extension: '+91', number: '9876543210' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = undefined;
  mockStackRoutes = [{ name: 'Login' }];
});

/**
 * Sign-in is a choice of method, and the chosen method is its own stack entry
 * (`step`), so the email/password form renders on the Login opened at PASSWORD.
 */
function renderPasswordStep() {
  mockRouteParams = { step: 'PASSWORD' };
  return renderWithProviders(<LoginScreen />);
}

describe('LoginScreen', () => {
  it('logs in and flips the auth gate', async () => {
    mockedLogin.mockResolvedValue({ token: 't', surveyCompleted: true });
    renderPasswordStep();
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
    renderPasswordStep();
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

  it('carries the typed channel and value into forgot password', () => {
    renderPasswordStep();
    fireEvent.press(screen.getByTestId('go-forgot-password'));
    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword', { recovery: mockHandoff });
  });

  it('spends a credential carried from signup on the provider login, once', async () => {
    mockedGoogle.mockResolvedValue({ token: 'g', surveyCompleted: true });
    mockRouteParams = {
      socialLogin: { idToken: 'carried-tok', email: 'a@b.com', provider: 'GOOGLE' },
    };
    const { rerender } = renderWithProviders(<LoginScreen />);
    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalledWith('g', true));
    expect(mockedGoogle).toHaveBeenCalledWith('carried-tok');
    rerender(<LoginScreen />);
    expect(mockedGoogle).toHaveBeenCalledTimes(1);
  });

  it('ignores a malformed carried credential', () => {
    mockRouteParams = { socialLogin: { idToken: '  ', email: 'a@b.com' } };
    renderWithProviders(<LoginScreen />);
    expect(mockedGoogle).not.toHaveBeenCalled();
  });

  it('opens on the method chooser and pushes each method as its own entry', () => {
    renderWithProviders(<LoginScreen />);
    // The landing step offers the two methods; the boxes are one entry in.
    expect(screen.queryByTestId('submit-login')).toBeNull();
    fireEvent.press(screen.getByTestId('continue-with-password'));
    expect(mockPush).toHaveBeenCalledWith('Login', { step: 'PASSWORD' });
    fireEvent.press(screen.getByTestId('continue-with-otp'));
    expect(mockPush).toHaveBeenCalledWith('Login', { step: 'OTP' });
  });

  it('shows the password boxes on its entry and pops back to the options beneath it', () => {
    mockStackRoutes = [{ name: 'Login' }, { name: 'Login' }];
    renderPasswordStep();
    expect(screen.getByTestId('submit-login')).toBeTruthy();
    expect(screen.queryByTestId('continue-with-password')).toBeNull();

    fireEvent.press(screen.getByTestId('back-to-options'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('opened straight on OTP (a link), goes to the options by replacing itself', () => {
    mockStackRoutes = [{ name: 'Signup' }, { name: 'Login' }];
    mockRouteParams = { step: 'OTP' };
    renderWithProviders(<LoginScreen />);
    expect(screen.getByTestId('otp-channel-step')).toBeTruthy();

    fireEvent.press(screen.getByTestId('otp-back'));
    expect(mockReplace).toHaveBeenCalledWith('Login');
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('shows the running app version footer', () => {
    renderWithProviders(<LoginScreen />);
    expect(screen.getByTestId('login-app-version')).toHaveTextContent(/App version/);
  });
});
