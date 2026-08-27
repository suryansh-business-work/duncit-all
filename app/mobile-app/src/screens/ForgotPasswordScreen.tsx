import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';

import { AuthScaffold } from '@/components/AuthScaffold';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ForgotPasswordForm, type ForgotPasswordValues } from '@/forms/forgot-password';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { requestPasswordResetOtp } from '@/services/auth.service';
import { toErrorMessage } from '@/utils/errors';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Forgot password — request an OTP by email, then move to the reset step.
 * Only registered emails receive an OTP; an unregistered email is flagged and
 * offered a Create-Account CTA. RN twin of mWeb's ForgotPasswordPage. */
export function ForgotPasswordScreen() {
  const { t } = useTranslation();
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
      setError(toErrorMessage(e, t('mweb.auth.somethingWentWrong')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      testID="forgot-password-screen"
      title={t('mweb.forgotPassword.title')}
      accentWord={t('mweb.forgotPassword.titleAccent')}
      subtitle={t('mweb.forgotPassword.subtitle')}
    >
      <ForgotPasswordForm
        loading={loading}
        errorMessage={error}
        emailError={unregistered ? t('mweb.forgotPassword.unregistered') : null}
        onSubmit={handleSubmit}
      />
      {unregistered ? (
        <YStack gap={8} alignItems="center">
          <Text fontSize={14} color="$muted">
            {t('mweb.forgotPassword.newToDuncit')}
          </Text>
          <PrimaryButton
            testID="forgot-create-account"
            label={t('mweb.forgotPassword.createAccount')}
            onPress={() => navigation.navigate('Signup')}
          />
        </YStack>
      ) : (
        <XStack justifyContent="center" gap={4}>
          <Text fontSize={14} color="$muted">
            {t('mweb.forgotPassword.remembered')}
          </Text>
          <Text
            pressStyle={PRESS_STYLE.inline}
            testID="forgot-back-login"
            fontSize={14}
            fontWeight="600"
            color="$primary"
            onPress={() => navigation.navigate('Login')}
          >
            {t('mweb.auth.backToLogin')}
          </Text>
        </XStack>
      )}
    </AuthScaffold>
  );
}
