import { useEffect, useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text } from 'tamagui';
import {
  claimGoogleSignupHandoff,
  createGoogleSignupClaims,
  readGoogleSignupHandoff,
} from '@duncit/utils';

import { AuthScaffold } from '@/components/AuthScaffold';
import { GoogleLinkConsentModal } from '@/components/GoogleLinkConsentModal';
import { GoogleSignupInviteModal } from '@/components/GoogleSignupInviteModal';
import { LegalLinks } from '@/components/LegalLinks';
import { type LoginSubmitValues } from '@/forms/login';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { login as loginService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { appVersion } from '@/utils/app-version';
import { toErrorMessage } from '@/utils/errors';
import { LoginMethodStep } from './LoginMethodStep';
import { LoginOtpStep } from './LoginOtpStep';
import { useOtpLogin } from './useOtpLogin';
import { LoginPasswordStep } from './LoginPasswordStep';
import { useSocialLogin } from './useSocialLogin';

/** Which part of the sign-in screen is showing. */
type LoginStep = 'CHOOSE' | 'PASSWORD' | 'OTP';

/** Which carried credential this app run has already logged in with — module
 * scope so it outlives the remount it guards against (see SignupScreen's twin). */
const CLAIMS = createGoogleSignupClaims();

export function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const authenticate = useAuthStore((s) => s.authenticate);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // A choice of method, not a place — reopening the app lands on the options.
  const [step, setStep] = useState<LoginStep>('CHOOSE');
  // Continue with OTP: a correct code flips the same auth gate every other
  // method flips.
  const otp = useOtpLogin(authenticate, t('mweb.auth.somethingWentWrong'));
  // Google and Apple: one door, the same consent step and signup invite.
  const social = useSocialLogin(setError);

  /*
    Arrived from signup's "you're already on Duncit — log in?", holding the
    credential the provider had already returned: spend it on the login here,
    where every answer it can get is handled. Claimed once per credential.
  */
  const route = useRoute<RouteProp<RootStackParamList, 'Login'>>();
  const carried = readGoogleSignupHandoff(route.params?.socialLogin);
  const carriedToken = carried?.idToken ?? '';
  useEffect(() => {
    const claimed = claimGoogleSignupHandoff(CLAIMS, carried);
    if (claimed) {
      social
        .start({ provider: claimed.provider ?? 'GOOGLE', idToken: claimed.idToken })
        .catch(() => undefined);
    }
    // Keyed by the credential itself; the claim guards the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carriedToken]);

  // Setting the token + survey flag flips the navigation gate to the survey or
  // app group automatically — no imperative navigation needed.
  const handleSubmit = async (values: LoginSubmitValues) => {
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

  const choosing = step === 'CHOOSE';
  // Decided above the JSX (S3358): the chooser keeps the welcome, and each
  // method names itself once its boxes are showing.
  let headingTitle = t('mweb.login.title');
  let headingAccent = t('mweb.login.titleAccent');
  if (step === 'PASSWORD') {
    headingTitle = t('mweb.login.passwordStepTitle');
    headingAccent = t('mweb.login.passwordStepTitleAccent');
  } else if (step === 'OTP') {
    headingTitle = t('mweb.otpLogin.title');
    headingAccent = t('mweb.otpLogin.titleAccent');
  }

  return (
    <AuthScaffold
      testID="login-screen"
      title={headingTitle}
      accentWord={headingAccent}
      subtitle={choosing ? t('mweb.login.subtitle') : undefined}
    >
      {choosing ? (
        <LoginMethodStep
          socialLoading={social.busy}
          onSocialCredential={(credential) => {
            social.start(credential).catch(() => undefined);
          }}
          onSocialError={setError}
          onChoosePassword={() => setStep('PASSWORD')}
          onChooseOtp={() => setStep('OTP')}
          onSignup={() => navigation.navigate('Signup')}
        />
      ) : null}
      {step === 'PASSWORD' ? (
        <LoginPasswordStep
          loading={loading}
          errorMessage={error}
          onSubmit={handleSubmit}
          onForgotPassword={(recovery) => navigation.navigate('ForgotPassword', { recovery })}
          onBack={() => setStep('CHOOSE')}
        />
      ) : null}
      {step === 'OTP' ? <LoginOtpStep otp={otp} onBack={() => setStep('CHOOSE')} /> : null}

      {choosing && error ? (
        <Text
          testID="login-error"
          role="alert"
          aria-live="polite"
          fontSize={14}
          color="$danger"
          textAlign="center"
        >
          {error}
        </Text>
      ) : null}

      <GoogleLinkConsentModal
        open={!!social.consent}
        provider={social.consent?.credential.provider ?? 'GOOGLE'}
        email={social.consent?.email ?? ''}
        busy={social.linking}
        error={social.consentError}
        onAllow={() => {
          social.allowLink().catch(() => undefined);
        }}
        onDeny={social.denyLink}
      />
      <GoogleSignupInviteModal
        open={!!social.invite}
        provider={social.invite?.provider ?? 'GOOGLE'}
        email={social.invite?.email ?? ''}
        onAccept={social.acceptInvite}
        onDismiss={social.dismissInvite}
      />
      {choosing ? null : <LegalLinks prefix={t('mweb.auth.legalSignIn')} />}
      <Text testID="login-app-version" textAlign="center" fontSize={12} color="$muted">
        {t('mweb.auth.appVersion', { vars: { version: appVersion() } })}
      </Text>
    </AuthScaffold>
  );
}
