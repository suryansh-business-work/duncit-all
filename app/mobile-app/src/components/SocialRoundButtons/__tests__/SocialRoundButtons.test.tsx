import { fireEvent, screen } from '@testing-library/react-native';
import type { SocialCredential } from '@duncit/utils';

import { useAppleConfigured } from '@/components/AppleAuthButton';
import { SocialRoundButtons } from '@/components/SocialRoundButtons';
import { renderWithProviders } from '@/utils/test-utils';

// Both buttons have their own suites; here each reports the name it was given
// and hands back a credential when pressed.
jest.mock('@/components/AppleAuthButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    useAppleConfigured: jest.fn(),
    AppleAuthButton: (p: {
      label: string;
      loading?: boolean;
      onCredential: (credential: SocialCredential) => void;
    }) => (
      <Text
        testID="apple-stub"
        onPress={() => p.onCredential({ provider: 'APPLE', idToken: 'apple-token' })}
      >
        {`${p.label}:${p.loading ? 'loading' : 'idle'}`}
      </Text>
    ),
  };
});
jest.mock('@/components/GoogleAuthButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    GoogleAuthButton: (p: { label: string; onIdToken: (idToken: string) => void }) => (
      <Text testID="google-stub" onPress={() => p.onIdToken('google-token')}>
        {p.label}
      </Text>
    ),
  };
});

const mockedAppleReady = jest.mocked(useAppleConfigured);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SocialRoundButtons', () => {
  it('offers Google alone until Apple is configured, named for signing in', () => {
    mockedAppleReady.mockReturnValue(false);
    const onCredential = jest.fn();
    renderWithProviders(
      <SocialRoundButtons intent="SIGN_IN" onCredential={onCredential} onError={jest.fn()} />,
    );

    expect(screen.getByTestId('google-stub')).toHaveTextContent('Sign in with Google');
    expect(screen.queryByTestId('apple-stub')).toBeNull();
    expect(screen.queryByText('Apple')).toBeNull();

    fireEvent.press(screen.getByTestId('google-stub'));
    expect(onCredential).toHaveBeenCalledWith({ provider: 'GOOGLE', idToken: 'google-token' });
  });

  it('adds the captioned Apple button once configured, named for signing in', () => {
    mockedAppleReady.mockReturnValue(true);
    const onCredential = jest.fn();
    renderWithProviders(
      <SocialRoundButtons intent="SIGN_IN" onCredential={onCredential} onError={jest.fn()} />,
    );

    expect(screen.getByTestId('apple-stub')).toHaveTextContent('Sign in with Apple:idle');
    expect(screen.getByText('Apple')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('apple-stub'));
    expect(onCredential).toHaveBeenCalledWith({ provider: 'APPLE', idToken: 'apple-token' });
  });

  it('names both buttons for signing up, and makes both wait while a credential is spent', () => {
    mockedAppleReady.mockReturnValue(true);
    renderWithProviders(
      <SocialRoundButtons intent="SIGN_UP" loading onCredential={jest.fn()} onError={jest.fn()} />,
    );

    expect(screen.getByTestId('google-stub')).toHaveTextContent('Continue with Google');
    expect(screen.getByTestId('apple-stub')).toHaveTextContent('Sign up with Apple:loading');
  });
});
