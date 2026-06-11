import type { ReactNode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SignupScreen } from '@/screens/SignupScreen';
import { register, signupWithGoogle } from '@/services/auth.service';
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
jest.mock('@/forms/signup', () => ({
  SignupForm: ({ onSubmit }: { onSubmit: (v: Record<string, string>) => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable
        testID="submit-signup"
        onPress={() =>
          onSubmit({ name: 'Riya', birthYear: '1995', email: 'r@b.com', password: 'pw' })
        }
      >
        <Text>s</Text>
      </Pressable>
    );
  },
}));

const mockedRegister = jest.mocked(register);
const mockedGoogle = jest.mocked(signupWithGoogle);

beforeEach(() => jest.clearAllMocks());

describe('SignupScreen', () => {
  it('registers and lands on the survey gate', async () => {
    mockedRegister.mockResolvedValue({ token: 't', surveyCompleted: false });
    renderWithProviders(<SignupScreen />);
    fireEvent.press(screen.getByTestId('submit-signup'));
    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalledWith('t', false));
  });

  it('authenticates via Google', async () => {
    mockedGoogle.mockResolvedValue({ token: 'g', surveyCompleted: false });
    renderWithProviders(<SignupScreen />);
    fireEvent.press(screen.getByTestId('google-btn'));
    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalledWith('g', false));
  });

  it('does not authenticate when registration fails', async () => {
    mockedRegister.mockRejectedValue(new Error('email taken'));
    renderWithProviders(<SignupScreen />);
    fireEvent.press(screen.getByTestId('submit-signup'));
    await waitFor(() => expect(mockedRegister).toHaveBeenCalled());
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('does not authenticate when Google sign-up fails', async () => {
    mockedGoogle.mockRejectedValue(new Error('google down'));
    renderWithProviders(<SignupScreen />);
    fireEvent.press(screen.getByTestId('google-btn'));
    await waitFor(() => expect(mockedGoogle).toHaveBeenCalled());
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('navigates to login', () => {
    renderWithProviders(<SignupScreen />);
    fireEvent.press(screen.getByTestId('go-login'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});
