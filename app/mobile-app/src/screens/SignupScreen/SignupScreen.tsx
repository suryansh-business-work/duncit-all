import { useEffect, useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack } from 'tamagui';
import {
  claimGoogleSignupHandoff,
  createGoogleSignupClaims,
  readGoogleSignupHandoff,
} from '@duncit/utils';

import { AuthDivider } from '@/components/AuthDivider';
import { AuthScaffold } from '@/components/AuthScaffold';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { LegalLinks } from '@/components/LegalLinks';
import { PolicyAcceptanceSheet } from '@/components/policy-acceptance';
import { SignupForm } from '@/forms/signup';
import { useSignupPolicies } from '@/hooks/usePolicies';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { GoogleDetailsStep } from './GoogleDetailsStep';
import { SignupStepperRail } from './SignupStepperRail';
import { VerifyWhatsappStep } from './VerifyWhatsappStep';
import { useSignupFlow } from './useSignupFlow';
import { allPoliciesAccepted } from '@/utils/policy-acceptance';
import { PRESS_STYLE } from '@duncit/buttons-native';

/**
 * Which carried credential this app run has already opened the Google door
 * with.
 *
 * Module scope on purpose: it has to outlive the screen, because the replay it
 * guards against is a SECOND mount reading the same navigation param — going
 * back to login and forward again. A ref would be reset by exactly the event it
 * exists to survive.
 */
const CLAIMS = createGoogleSignupClaims();

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

  /*
    Arrived from the login screen's "no Duncit account yet" invite, holding the
    credential Google had already returned — so this door opens on the
    acceptance sheet with it in hand rather than on a Google button they have
    just pressed.

    Waits for `loaded`, because `handleGoogle` branches on whether there is
    anything to accept: run before the policies land and a signup with nothing
    to gate would open an empty sheet instead of going straight through.

    CLAIMED, not read. A navigation param outlives the remount that re-reads it
    — going back to login and forward again replays it — and starting the Google
    door a second time would reopen the sheet on top of the number and code
    steps already running. The claim answers once per credential, which is what
    makes re-running this a no-op instead.
  */
  const route = useRoute<RouteProp<RootStackParamList, 'Signup'>>();
  const carried = readGoogleSignupHandoff(route.params?.googleSignup);
  const carriedToken = carried?.idToken ?? '';
  useEffect(() => {
    if (!loaded) return;
    const claimed = claimGoogleSignupHandoff(CLAIMS, carried);
    if (claimed) handleGoogle(claimed.idToken);
    // Keyed by the credential itself; the claim guards the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carriedToken, loaded]);

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
      {onNumberStep ? <GoogleDetailsStep onSubmit={flow.submitDetails} /> : null}
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
