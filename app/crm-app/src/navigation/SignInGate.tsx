import type { ReactNode } from 'react';
import { Spinner, YStack } from 'tamagui';

import { useAuthStore } from '@/stores/auth.store';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { TwoFactorScreen } from '@/screens/auth/TwoFactorScreen';
import { SecurityVerificationScreen } from '@/screens/auth/SecurityVerificationScreen';

/**
 * The sign-in steps in front of the app, decided by the auth store: a spinner
 * while the saved session is read, then sign-in, the 2-step code, or Security
 * Verification — and the app itself (`children`) once all are done.
 */
export function SignInGate({ children }: Readonly<{ children: ReactNode }>) {
  const status = useAuthStore((s) => s.status);
  if (status === 'loading') {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$background"
        aria-busy
      >
        <Spinner size="large" color="$accentText" />
      </YStack>
    );
  }
  if (status === 'signedOut') return <LoginScreen />;
  if (status === 'twoFactor') return <TwoFactorScreen />;
  if (status === 'security') return <SecurityVerificationScreen />;
  return <>{children}</>;
}
