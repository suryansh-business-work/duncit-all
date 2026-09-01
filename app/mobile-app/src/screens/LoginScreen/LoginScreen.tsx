import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text } from 'tamagui';

import { AuthScaffold } from '@/components/AuthScaffold';
import { GoogleLinkConsentModal } from '@/components/GoogleLinkConsentModal';
import { LegalLinks } from '@/components/LegalLinks';
import { type LoginSubmitValues } from '@/forms/login';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { linkGoogleAccount, login as loginService, loginWithGoogle } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { appVersion } from '@/utils/app-version';
import { errorCode, toErrorMessage } from '@/utils/errors';
import { LoginMethodStep } from './LoginMethodStep';
import { LoginOtpStep } from './LoginOtpStep';
import { useOtpLogin } from './useOtpLogin';
import { LoginPasswordStep } from './LoginPasswordStep';

/** Which part of the sign-in screen is showing. */
type LoginStep = 'CHOOSE' | 'PASSWORD' | 'OTP';

export function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const authenticate = useAuthStore((s) => s.authenticate);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // A choice of method, not a place — reopening the app lands on the options.
  const [step, setStep] = useState<LoginStep>('CHOOSE');
  // The pending consent grant. Holds the id_token loginWithGoogle just refused
  // so "Allow" can spend it on linkGoogleAccount without a second Google round
  // trip — Google id tokens stay valid for an hour, far longer than this step.
  const [consent, setConsent] = useState<{ idToken: string; email: string } | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  // Continue with OTP: a correct code flips the same auth gate every other
  // method flips.
  const otp = useOtpLogin(authenticate, t('mweb.auth.somethingWentWrong'));

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

  const handleGoogle = async (idToken: string) => {
    setError(null);
    try {
      const result = await loginWithGoogle(idToken);
      authenticate(result.token, result.surveyCompleted);
    } catch (e) {
      // Not a dead end any more — the account exists and Google has verified
      // this address, so we ask whether to grant Google sign-in to it.
      if (errorCode(e) === 'EMAIL_LOGIN_REQUIRED') {
        const matched = (e as { extensions?: { email?: string } }).extensions?.email;
        setConsentError(null);
        setConsent({ idToken, email: matched ?? '' });
        return;
      }
      setError(toErrorMessage(e, t('mweb.auth.googleFailed')));
    }
  };

  const allowGoogleLink = async () => {
    if (!consent) return;
    setConsentError(null);
    setLinking(true);
    try {
      const result = await linkGoogleAccount(consent.idToken);
      setConsent(null);
      authenticate(result.token, result.surveyCompleted);
    } catch (e) {
      // Kept open with the reason: closing would look like the grant worked.
      setConsentError(toErrorMessage(e, t('mweb.login.linkConsentFailed')));
    } finally {
      setLinking(false);
    }
  };

  // Denying changes nothing about the account. Back to the form with a warning
  // that says both what happened and how to get here again.
  const denyGoogleLink = () => {
    setConsent(null);
    setConsentError(null);
    setError(t('mweb.login.linkConsentDenied'));
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
      subtitle={choosing ? t('mweb.login.subtitle') : ''}
    >
      {choosing ? (
        <LoginMethodStep
          onGoogle={(idToken) => {
            handleGoogle(idToken).catch(() => undefined);
          }}
          onGoogleError={setError}
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
          onForgotPassword={() => navigation.navigate('ForgotPassword')}
          onBack={() => setStep('CHOOSE')}
        />
      ) : null}
      {step === 'OTP' ? <LoginOtpStep otp={otp} onBack={() => setStep('CHOOSE')} /> : null}

      {choosing && error ? (
        <Text testID="login-error" fontSize={14} color="$danger" textAlign="center">
          {error}
        </Text>
      ) : null}

      <GoogleLinkConsentModal
        open={!!consent}
        email={consent?.email ?? ''}
        busy={linking}
        error={consentError}
        onAllow={() => {
          allowGoogleLink().catch(() => undefined);
        }}
        onDeny={denyGoogleLink}
      />
      <LegalLinks prefix={t('mweb.auth.legalSignIn')} />
      <Text testID="login-app-version" textAlign="center" fontSize={12} color="$muted">
        {t('mweb.auth.appVersion', { vars: { version: appVersion() } })}
      </Text>
    </AuthScaffold>
  );
}
