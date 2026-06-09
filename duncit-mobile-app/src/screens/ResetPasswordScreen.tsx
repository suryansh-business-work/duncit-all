import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { AuthScaffold } from '@/components/AuthScaffold';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ResetPasswordForm, type ResetPasswordFormValues } from '@/forms/reset-password';
import type { RootStackParamList } from '@/navigation/types';
import { requestPasswordResetOtp, resetPasswordWithOtp } from '@/services/auth.service';
import { toErrorMessage } from '@/utils/errors';

/** Reset password — OTP + new password, then a success screen. RN twin of mWeb's
 * ResetPasswordPage (with the "password reset successfully" state). */
export function ResetPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ResetPassword'>>();
  const email = route.params?.email ?? '';
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    setError(null);
    setLoading(true);
    try {
      await resetPasswordWithOtp({ email, otp: values.otp, new_password: values.new_password });
      setDone(true);
    } catch (e) {
      setError(toErrorMessage(e, 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthScaffold
        testID="reset-password-success"
        title="Password reset"
        accentWord="successfully"
        subtitle="Your password has been updated. You can now log in with your new password."
      >
        <YStack alignItems="center" gap={16}>
          <MaterialIcons name="check-circle" size={64} color={semantic.success} />
          <PrimaryButton
            testID="reset-go-login"
            label="Go to login"
            onPress={() => navigation.navigate('Login')}
          />
        </YStack>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      testID="reset-password-screen"
      title="Reset"
      accentWord="password"
      subtitle={`Enter the OTP sent to ${email || 'your email'} and choose a new password.`}
    >
      <ResetPasswordForm loading={loading} errorMessage={error} onSubmit={handleSubmit} />
      <XStack justifyContent="center" gap={4}>
        <Text fontSize={14} color="$muted">
          Didn’t get it?
        </Text>
        <Text
          testID="reset-resend"
          fontSize={14}
          fontWeight="600"
          color="$primary"
          onPress={() => email && requestPasswordResetOtp(email)}
        >
          Resend OTP
        </Text>
      </XStack>
    </AuthScaffold>
  );
}
