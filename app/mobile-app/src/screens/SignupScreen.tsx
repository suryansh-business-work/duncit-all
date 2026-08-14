import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack } from 'tamagui';

import { AuthDivider } from '@/components/AuthDivider';
import { AuthScaffold } from '@/components/AuthScaffold';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { LegalLinks } from '@/components/LegalLinks';
import { PolicyAcceptanceSheet } from '@/components/policy-acceptance';
import { SignupForm, type SignupFormValues } from '@/forms/signup';
import { useSignupPolicies } from '@/hooks/usePolicies';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { register, signupWithGoogle } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { toErrorMessage } from '@/utils/errors';
import { fireAndForget } from '@/utils/fire-and-forget';
import { allPoliciesAccepted } from '@/utils/policy-acceptance';

export function SignupScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const authenticate = useAuthStore((s) => s.authenticate);
  const { policies, loaded } = useSignupPolicies();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // The Google token waiting on the acceptance sheet. Holding it here is what
  // keeps the account uncreated while the person decides: Google has proved who
  // they are, and nothing else has happened yet.
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleAccepted, setGoogleAccepted] = useState<string[]>([]);

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
        acceptedPolicyIds: values.acceptedPolicyIds,
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
  const finishGoogleSignup = async (idToken: string, policyIds: string[]) => {
    setGoogleToken(null);
    setError(null);
    try {
      const result = await signupWithGoogle(idToken, policyIds);
      authenticate(result.token, result.surveyCompleted, true);
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.auth.googleFailed')));
    }
  };

  /*
    The same sheet the form opens, shown after Google returns instead of after
    the account exists — signupWithGoogle is new-account-only, so this is the
    only moment a refusal can still leave nothing behind. Nothing gating signup
    means no dialog worth showing.
  */
  const handleGoogle = (idToken: string) => {
    setError(null);
    setGoogleAccepted([]);
    if (loaded && policies.length === 0) {
      fireAndForget(finishGoogleSignup(idToken, []));
      return;
    }
    setGoogleToken(idToken);
  };

  const handleGooglePolicies = (ids: string[]) => {
    setGoogleAccepted(ids);
    if (googleToken && loaded && allPoliciesAccepted(policies, ids)) {
      fireAndForget(finishGoogleSignup(googleToken, ids));
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
      <PolicyAcceptanceSheet
        open={!!googleToken}
        variant="google"
        acceptedIds={googleAccepted}
        onChange={handleGooglePolicies}
        onClose={() => setGoogleToken(null)}
      />
      <LegalLinks prefix={t('mweb.auth.legalSignUp')} />
    </AuthScaffold>
  );
}
