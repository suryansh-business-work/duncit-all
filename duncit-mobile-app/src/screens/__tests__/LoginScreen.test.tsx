import type { ReactNode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { LoginScreen } from '@/screens/LoginScreen';
import { login, loginWithGoogle } from '@/services/auth.service';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockAuthenticate = jest.fn();
jest.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: { authenticate: jest.Mock }) => unknown) =>
    selector({ authenticate: mockAuthenticate }),
}));

jest.mock('@/services/auth.service');
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

describe('LoginScreen', () => {
  it('logs in and flips the auth gate', async () => {
    mockedLogin.mockResolvedValue({ token: 't', surveyCompleted: true });
    renderWithProviders(<LoginScreen />);
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
    fireEvent.press(screen.getByTestId('submit-login'));
    await waitFor(() => expect(mockedLogin).toHaveBeenCalled());
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('navigates to signup', () => {
    renderWithProviders(<LoginScreen />);
    fireEvent.press(screen.getByTestId('go-signup'));
    expect(mockNavigate).toHaveBeenCalledWith('Signup');
  });

  it('navigates to forgot password', () => {
    renderWithProviders(<LoginScreen />);
    fireEvent.press(screen.getByTestId('go-forgot-password'));
    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });
});
