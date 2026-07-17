import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';

import { AuthScaffold } from '@/components/AuthScaffold';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ForgotPasswordForm, type ForgotPasswordValues } from '@/forms/forgot-password';
import type { RootStackParamList } from '@/navigation/types';
import { requestPasswordResetOtp } from '@/services/auth.service';
import { toErrorMessage } from '@/utils/errors';

/** Forgot password — request an OTP by email, then move to the reset step.
 * Only registered emails receive an OTP; an unregistered email is flagged and
 * offered a Create-Account CTA. RN twin of mWeb's ForgotPasswordPage. */
export function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unregistered, setUnregistered] = useState(false);

  const handleSubmit = async (values: ForgotPasswordValues) => {
    setError(null);
    setUnregistered(false);
    setLoading(true);
    try {
      const { registered } = await requestPasswordResetOtp(values.email);
      if (!registered) {
        setUnregistered(true);
        return;
      }
      navigation.navigate('ResetPassword', { email: values.email.trim().toLowerCase() });
    } catch (e) {
      setError(toErrorMessage(e, 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      testID="forgot-password-screen"
      title="Forgot"
      accentWord="password?"
      subtitle="Enter your email and we’ll send you a 6-digit OTP to reset your password."
    >
      <ForgotPasswordForm
        loading={loading}
        errorMessage={error}
        emailError={unregistered ? 'Unregistered User' : null}
        onSubmit={handleSubmit}
      />
      {unregistered ? (
        <YStack gap={8} alignItems="center">
          <Text fontSize={14} color="$muted">
            New to Duncit?
          </Text>
          <PrimaryButton
            testID="forgot-create-account"
            label="Create Account"
            onPress={() => navigation.navigate('Signup')}
          />
        </YStack>
      ) : (
        <XStack justifyContent="center" gap={4}>
          <Text fontSize={14} color="$muted">
            Remembered it?
          </Text>
          <Text
            testID="forgot-back-login"
            fontSize={14}
            fontWeight="600"
            color="$primary"
            onPress={() => navigation.navigate('Login')}
          >
            Back to login
          </Text>
        </XStack>
      )}
    </AuthScaffold>
  );
}
