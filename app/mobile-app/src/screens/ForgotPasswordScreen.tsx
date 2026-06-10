import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack } from 'tamagui';

import { AuthScaffold } from '@/components/AuthScaffold';
import { ForgotPasswordForm, type ForgotPasswordValues } from '@/forms/forgot-password';
import type { RootStackParamList } from '@/navigation/types';
import { requestPasswordResetOtp } from '@/services/auth.service';
import { toErrorMessage } from '@/utils/errors';

/** Forgot password — request an OTP by email, then move to the reset step.
 * RN twin of mWeb's ForgotPasswordPage. */
export function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: ForgotPasswordValues) => {
    setError(null);
    setLoading(true);
    try {
      await requestPasswordResetOtp(values.email);
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
      <ForgotPasswordForm loading={loading} errorMessage={error} onSubmit={handleSubmit} />
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
    </AuthScaffold>
  );
}
