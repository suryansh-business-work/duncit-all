import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { AuthScaffold } from '@/components/AuthScaffold';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ResetPasswordForm, type ResetPasswordFormValues } from '@/forms/reset-password';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { requestPasswordResetOtp, resetPasswordWithOtp } from '@/services/auth.service';
import { toErrorMessage } from '@/utils/errors';

/** Reset password — OTP + new password, then a success screen. RN twin of mWeb's
 * ResetPasswordPage (with the "password reset successfully" state). */
export function ResetPasswordScreen() {
  const { t } = useTranslation();
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
      setError(toErrorMessage(e, t('mweb.auth.somethingWentWrong')));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthScaffold
        testID="reset-password-success"
        title={t('mweb.resetPassword.successTitle')}
        accentWord={t('mweb.resetPassword.successTitleAccent')}
        subtitle={t('mweb.resetPassword.successSubtitle')}
      >
        <YStack alignItems="center" gap={16}>
          <MaterialIcons name="check-circle" size={64} color={semantic.success} />
          <PrimaryButton
            testID="reset-go-login"
            label={t('mweb.resetPassword.goToLogin')}
            onPress={() => navigation.navigate('Login')}
          />
        </YStack>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      testID="reset-password-screen"
      title={t('mweb.resetPassword.title')}
      accentWord={t('mweb.resetPassword.titleAccent')}
      subtitle={t('mweb.resetPassword.subtitle', {
        vars: { email: email || t('mweb.resetPassword.emailFallback') },
      })}
    >
      <ResetPasswordForm loading={loading} errorMessage={error} onSubmit={handleSubmit} />
      <XStack justifyContent="center" gap={4}>
        <Text fontSize={14} color="$muted">
          {t('mweb.resetPassword.didntGetIt')}
        </Text>
        <Text
          testID="reset-resend"
          fontSize={14}
          fontWeight="600"
          color="$primary"
          onPress={() => email && requestPasswordResetOtp(email)}
        >
          {t('mweb.resetPassword.resend')}
        </Text>
      </XStack>
    </AuthScaffold>
  );
}
