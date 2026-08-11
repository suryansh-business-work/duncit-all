import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack } from 'tamagui';

import { AuthDivider } from '@/components/AuthDivider';
import { AuthScaffold } from '@/components/AuthScaffold';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { LegalLinks } from '@/components/LegalLinks';
import { SignupForm, type SignupFormValues } from '@/forms/signup';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { register, signupWithGoogle } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { toErrorMessage } from '@/utils/errors';

export function SignupScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const authenticate = useAuthStore((s) => s.authenticate);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // New accounts always land on the survey (surveyCompleted === false).
  const handleSubmit = async (values: SignupFormValues) => {
    setError(null);
    setLoading(true);
    try {
      const result = await register({
        name: values.name,
        dob: values.dob,
        email: values.email,
        password: values.password,
        referralCode: values.referralCode,
      });
      authenticate(result.token, result.surveyCompleted);
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.auth.somethingWentWrong')));
    } finally {
      setLoading(false);
    }
  };

  /*
    Google hands back a finished account with no form attached, so its referral
    question has to be asked afterwards — hence the third argument, which routes
    the gate to the skippable referral step before the survey. The email path
    above never needs it: its form already carried the code.
  */
  const handleGoogle = async (idToken: string) => {
    setError(null);
    try {
      const result = await signupWithGoogle(idToken);
      authenticate(result.token, result.surveyCompleted, true);
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.auth.googleFailed')));
    }
  };

  return (
    <AuthScaffold
      testID="signup-screen"
      title={t('mweb.signup.title')}
      accentWord={t('mweb.signup.titleAccent')}
      subtitle={t('mweb.signup.subtitle')}
    >
      <GoogleAuthButton onIdToken={handleGoogle} onError={setError} />
      <AuthDivider label={t('mweb.auth.orEmail')} />
      <SignupForm loading={loading} errorMessage={error} onSubmit={handleSubmit} />
      <XStack justifyContent="center" gap={4}>
        <Text fontSize={14} color="$muted">
          {t('mweb.signup.haveAccount')}
        </Text>
        <Text
          testID="go-login"
          fontSize={14}
          fontWeight="600"
          color="$primary"
          onPress={() => navigation.navigate('Login')}
        >
          {t('mweb.signup.logIn')}
        </Text>
      </XStack>
      <LegalLinks prefix={t('mweb.auth.legalSignUp')} />
    </AuthScaffold>
  );
}
