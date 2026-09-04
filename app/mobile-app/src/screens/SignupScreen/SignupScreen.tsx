import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack } from 'tamagui';

import { AuthDivider } from '@/components/AuthDivider';
import { AuthScaffold } from '@/components/AuthScaffold';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { LegalLinks } from '@/components/LegalLinks';
import { PolicyAcceptanceSheet } from '@/components/policy-acceptance';
import { SignupForm } from '@/forms/signup';
import { useSignupPolicies } from '@/hooks/usePolicies';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { SignupStepperRail } from './SignupStepperRail';
import { VerifyWhatsappStep } from './VerifyWhatsappStep';
import { WhatsappNumberStep } from './WhatsappNumberStep';
import { useSignupFlow } from './useSignupFlow';
import { allPoliciesAccepted } from '@/utils/policy-acceptance';
import { PRESS_STYLE } from '@duncit/buttons-native';

export function SignupScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { policies, loaded } = useSignupPolicies();
  const flow = useSignupFlow();
  // The Google token waiting on the acceptance sheet. Holding it here is what
  // keeps the account uncreated while the person decides: Google has proved who
  // they are, and nothing else has happened yet.
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleAccepted, setGoogleAccepted] = useState<string[]>([]);

  /*
    The same sheet the form opens, shown after Google returns instead of after
    the account exists — signupWithGoogle is new-account-only, so this is the
    only moment a refusal can still leave nothing behind. Nothing gating signup
    means no dialog worth showing.
  */
  const handleGoogle = (idToken: string) => {
    flow.setError(null);
    setGoogleAccepted([]);
    if (loaded && policies.length === 0) {
      flow.googleAccepted(idToken, []);
      return;
    }
    setGoogleToken(idToken);
  };

  const handleGooglePolicies = (ids: string[]) => {
    setGoogleAccepted(ids);
    if (googleToken && loaded && allPoliciesAccepted(policies, ids)) {
      setGoogleToken(null);
      flow.googleAccepted(googleToken, ids);
    }
  };

  const onNumberStep = flow.askingNumber;
  const onVerifyStep = flow.step === 'VERIFY' && flow.verifying !== null;
  // Decided above the JSX (S3358): the two doors reach the same code step from
  // different places, and only the form door still has a form to show.
  const showForm = !onNumberStep && !onVerifyStep;

  return (
    <AuthScaffold
      testID="signup-screen"
      title={t('mweb.signup.title')}
      accentWord={t('mweb.signup.titleAccent')}
      subtitle={t('mweb.signup.subtitle')}
    >
      <SignupStepperRail step={flow.step} askingNumber={flow.askingNumber} />
      {onNumberStep ? <WhatsappNumberStep onSubmit={flow.submitNumber} /> : null}
      {onVerifyStep && flow.verifying ? (
        <VerifyWhatsappStep
          extension={flow.verifying.extension}
          number={flow.verifying.number}
          email={flow.pendingEmail}
          creating={flow.creating}
          onVerified={flow.createAccount}
        />
      ) : null}
      {showForm ? (
        <>
          <GoogleAuthButton
            loading={flow.creating}
            onIdToken={handleGoogle}
            onError={flow.setError}
          />
          <AuthDivider label={t('mweb.auth.orEmail')} />
          <SignupForm
            step={flow.step}
            onStep={flow.setStep}
            errorMessage={flow.error}
            onSubmit={flow.submitForm}
          />
        </>
      ) : null}
      <XStack justifyContent="center" gap={4}>
        <Text fontSize={14} color="$muted">
          {t('mweb.signup.haveAccount')}
        </Text>
        <Text
          pressStyle={PRESS_STYLE.inline}
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
