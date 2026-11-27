import { Text } from 'react-native';
import { screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';
import { useAuthStore } from '@/stores/auth.store';
import { SignInGate } from '../SignInGate';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/screens/auth/LoginScreen', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return { LoginScreen: () => <MockText>sign-in</MockText> };
});
jest.mock('@/screens/auth/TwoFactorScreen', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return { TwoFactorScreen: () => <MockText>two-step</MockText> };
});
jest.mock('@/screens/auth/SecurityVerificationScreen', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return { SecurityVerificationScreen: () => <MockText>security</MockText> };
});

/** The sign-in steps in front of the app, one per auth state. */

const gate = () =>
  renderWithTheme(
    <SignInGate>
      <Text>the app</Text>
    </SignInGate>,
  );

describe('SignInGate', () => {
  it.each([
    ['signedOut', 'sign-in'],
    ['twoFactor', 'two-step'],
    ['security', 'security'],
  ] as const)('shows the %s step instead of the app', (status, text) => {
    useAuthStore.setState({ status });
    gate();
    expect(screen.getByText(text)).toBeOnTheScreen();
    expect(screen.queryByText('the app')).toBeNull();
  });

  it('waits on a spinner while the saved session is read, then opens the app once signed in', () => {
    useAuthStore.setState({ status: 'loading' });
    const { rerender } = gate();
    expect(screen.queryByText('the app')).toBeNull();
    useAuthStore.setState({ status: 'signedIn' });
    rerender(
      <SignInGate>
        <Text>the app</Text>
      </SignInGate>,
    );
    expect(screen.getByText('the app')).toBeOnTheScreen();
  });
});
