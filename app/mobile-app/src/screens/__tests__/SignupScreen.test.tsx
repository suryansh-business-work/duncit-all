import type { ReactNode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SignupScreen } from '@/screens/SignupScreen';
import { register, signupWithGoogle } from '@/services/auth.service';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate }),
  // No Google hand-off from the login screen: the form starts empty.
  useRoute: () => ({ params: undefined }),
}));

const mockAuthenticate = jest.fn();
jest.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: { authenticate: jest.Mock }) => unknown) =>
    selector({ authenticate: mockAuthenticate }),
}));

jest.mock('@/services/auth.service');
/* Google's fast path is gated on the policy list having answered. Unmocked it
   never loads, so the sheet opens and the credential is never spent. */
jest.mock('@/hooks/usePolicies', () => ({
  useSignupPolicies: () => ({ policies: [], loaded: true }),
}));
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
/* The code step is its own suite; this stub hands back a proven-number token
   and shows the refusal the screen passes down, like the real step does. */
jest.mock('@/screens/SignupScreen/VerifyWhatsappStep', () => ({
  VerifyWhatsappStep: ({
    onVerified,
    refusal,
    number,
  }: {
    onVerified: (token: string) => void;
    refusal?: string | null;
    number: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    return (
      <>
        <Pressable testID="finish-whatsapp" onPress={() => onVerified('wa-tok')}>
          <Text testID="verify-number">{number}</Text>
        </Pressable>
        {refusal ? <Text testID="verify-refusal">{refusal}</Text> : null}
      </>
    );
  },
}));
/* Google's own number + date-of-birth step, answered in one press. */
jest.mock('@/screens/SignupScreen/GoogleDetailsStep', () => ({
  GoogleDetailsStep: ({ onSubmit }: { onSubmit: (v: Record<string, unknown>) => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable
        testID="submit-google-details"
        onPress={() =>
          onSubmit({
            phoneExtension: '+91',
            phoneNumber: '9845099999',
            whatsappIsMobile: true,
            dob: '1990-01-02',
            name: '',
          })
        }
      >
        <Text>d</Text>
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
          onSubmit({
            name: 'Riya',
            dob: '1995-04-23',
            email: 'r@b.com',
            phoneExtension: '+91',
            phoneNumber: '9845012345',
            password: 'pw',
          })
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
  it('moves to the WhatsApp step on the form number, creating nothing yet', async () => {
    renderWithProviders(<SignupScreen />);
    fireEvent.press(screen.getByTestId('submit-signup'));

    await waitFor(() => expect(screen.getByTestId('finish-whatsapp')).toBeOnTheScreen());
    expect(screen.getByTestId('verify-number')).toHaveTextContent('9845012345');
    expect(screen.queryByTestId('submit-signup')).toBeNull();
    /* Nothing exists until the code answers, so leaving here leaves nothing
       behind — and the auth gate stays shut. */
    expect(mockedRegister).not.toHaveBeenCalled();
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('creates the account with the WhatsApp proof, then signs in', async () => {
    mockedRegister.mockResolvedValue({ token: 't', surveyCompleted: false });
    renderWithProviders(<SignupScreen />);
    fireEvent.press(screen.getByTestId('submit-signup'));
    await waitFor(() => expect(screen.getByTestId('finish-whatsapp')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('finish-whatsapp'));
    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalledWith('t', false, false));
    expect(mockedRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Riya',
        email: 'r@b.com',
        phoneExtension: '+91',
        phoneNumber: '9845012345',
      }),
      'wa-tok',
    );
  });

  it('runs Google through its own number step and the code step before signing in', async () => {
    mockedGoogle.mockResolvedValue({ token: 'g', surveyCompleted: false });
    renderWithProviders(<SignupScreen />);
    fireEvent.press(screen.getByTestId('google-btn'));

    // No policies to accept, so the credential goes straight to the number step.
    await waitFor(() => expect(screen.getByTestId('submit-google-details')).toBeOnTheScreen());
    expect(mockedGoogle).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('submit-google-details'));
    expect(screen.getByTestId('verify-number')).toHaveTextContent('9845099999');

    fireEvent.press(screen.getByTestId('finish-whatsapp'));
    // The third argument routes Google to the referral step: it had no form to
    // carry a code, so it is asked for after the account exists.
    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalledWith('g', false, true));
    expect(mockedGoogle).toHaveBeenCalledWith(
      'idtok',
      [],
      { extension: '+91', number: '9845099999', alsoMobile: true, whatsappToken: 'wa-tok' },
      '1990-01-02',
    );
  });

  it('shows the refusal on the code step and does not sign in when registration fails', async () => {
    mockedRegister.mockRejectedValue(new Error('email taken'));
    renderWithProviders(<SignupScreen />);
    fireEvent.press(screen.getByTestId('submit-signup'));
    await waitFor(() => expect(screen.getByTestId('finish-whatsapp')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('finish-whatsapp'));

    await waitFor(() =>
      expect(screen.getByTestId('verify-refusal')).toHaveTextContent('email taken'),
    );
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('shows the refusal and does not sign in when Google sign-up fails', async () => {
    mockedGoogle.mockRejectedValue(new Error('google down'));
    renderWithProviders(<SignupScreen />);
    fireEvent.press(screen.getByTestId('google-btn'));
    await waitFor(() => expect(screen.getByTestId('submit-google-details')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('submit-google-details'));
    fireEvent.press(screen.getByTestId('finish-whatsapp'));

    await waitFor(() =>
      expect(screen.getByTestId('verify-refusal')).toHaveTextContent('google down'),
    );
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('navigates to login', () => {
    renderWithProviders(<SignupScreen />);
    fireEvent.press(screen.getByTestId('go-login'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});
