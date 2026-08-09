import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack } from 'tamagui';

import { AuthAvatarsStrip } from '@/components/AuthAvatarsStrip';
import { AuthDivider } from '@/components/AuthDivider';
import { AuthScaffold } from '@/components/AuthScaffold';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { LegalLinks } from '@/components/LegalLinks';
import { LoginForm, type LoginFormValues } from '@/forms/login';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { login as loginService, loginWithGoogle } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { appVersion } from '@/utils/app-version';
import { toErrorMessage } from '@/utils/errors';

export function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const authenticate = useAuthStore((s) => s.authenticate);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Setting the token + survey flag flips the navigation gate to the survey or
  // app group automatically — no imperative navigation needed.
  const handleSubmit = async (values: LoginFormValues) => {
    setError(null);
    setLoading(true);
    try {
      const result = await loginService(values);
      authenticate(result.token, result.surveyCompleted);
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.auth.somethingWentWrong')));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (idToken: string) => {
    setError(null);
    try {
      const result = await loginWithGoogle(idToken);
      authenticate(result.token, result.surveyCompleted);
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.auth.googleFailed')));
    }
  };

  return (
    <AuthScaffold
      testID="login-screen"
      title={t('mweb.login.title')}
      accentWord={t('mweb.login.titleAccent')}
      subtitle={t('mweb.login.subtitle')}
    >
      <AuthAvatarsStrip caption={t('mweb.login.avatarsCaption')} />
      <LoginForm loading={loading} errorMessage={error} onSubmit={handleSubmit} />
      <XStack justifyContent="flex-end">
        <Text
          testID="go-forgot-password"
          fontSize={14}
          fontWeight="600"
          color="$primary"
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          {t('mweb.login.forgotPassword')}
        </Text>
      </XStack>
      <AuthDivider />
      <GoogleAuthButton
        label={t('mweb.login.googleSignIn')}
        onIdToken={handleGoogle}
        onError={setError}
      />
      <XStack justifyContent="center" gap={4}>
        <Text fontSize={14} color="$muted">
          {t('mweb.login.newHere')}
        </Text>
        <Text
          testID="go-signup"
          fontSize={14}
          fontWeight="600"
          color="$primary"
          onPress={() => navigation.navigate('Signup')}
        >
          {t('mweb.login.createOne')}
        </Text>
      </XStack>
      <LegalLinks prefix={t('mweb.auth.legalSignIn')} />
      <Text testID="login-app-version" textAlign="center" fontSize={12} color="$muted">
        {t('mweb.auth.appVersion', { vars: { version: appVersion() } })}
      </Text>
    </AuthScaffold>
  );
}
