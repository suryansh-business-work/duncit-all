import { readReferralCode } from '@duncit/utils';
import { Alert, Box, Divider, Stack, Typography } from '@mui/material';
import { auth } from '@duncit/auth-tokens';
import AuthBackground from '../../components/AuthBackground';
import AuthLogo from '../../components/AuthLogo';
import AuthModeToggle from '../../components/AuthModeToggle';
import AuthScreenFrame from '../../components/AuthScreenFrame';
import LegalLinks from '../../components/LegalLinks';
import { useTranslation } from '../../i18n/useTranslation';
import { useGoogleSignup } from '../../hooks/useGoogleSignup';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import { GoogleSignupPolicyGate, useSignupPolicies } from '../../components/policy-acceptance';
import { RegisterForm, registerDefaults } from '../../forms/register';
import SignupStepperRail from './SignupStepperRail';
import VerifyWhatsappStep from './VerifyWhatsappStep';
import WhatsappNumberStep from './WhatsappNumberStep';
import { useSignupFlow } from './useSignupFlow';

/**
 * Join Duncit — four steps.
 *
 * The first three collect the account and are the form's; the fourth settles
 * the WhatsApp number and is this page's, because `requestWhatsAppOtp`
 * authenticates its caller and so can only run once an account exists. That
 * token is stored the moment it does, which is what makes the last step
 * authorised without the person having signed in.
 *
 * Google is the same four steps with the first three answered for it — so it
 * lands straight on the last one, where it has to ask for the number before it
 * can ask for the code. What each door does is `useSignupFlow`'s; this file is
 * the view.
 *
 * RN twin: app/mobile-app/src/screens/SignupScreen.
 */
export default function RegisterPage() {
  const { t } = useTranslation();

  /*
    A shared referral link carries its code in the URL, and this page is where
    it lands — so it arrives as the form's initial value rather than as a
    separate mutation fired after the account exists. The code now travels WITH
    the signup, and the server checks it before creating anything: a code that
    has gone stale fails the form the sender's friend is still looking at,
    instead of silently costing them both their coins.
  */
  const linkedCode = readReferralCode(globalThis.location.search) ?? '';
  const initialValues = { ...registerDefaults, referralCode: linkedCode };

  /*
    Both signup doors are gated by the same policies, so the list is fetched
    once here and shared: the form reads it to build its validation rule, and
    the Google gate reads it to know when the credential can be spent.
  */
  const { policies, loading: policiesLoading, failed: policiesFailed } = useSignupPolicies();
  const flow = useSignupFlow(linkedCode);
  const google = useGoogleSignup(flow.googleAccepted);

  const onNumberStep = flow.askingNumber;
  const onVerifyStep = flow.step === 'VERIFY' && flow.verifying !== null;
  // Decided above the JSX (S3358): the two doors reach the same code step from
  // different places, and only the form door still has a form to show.
  const showForm = !onNumberStep && !onVerifyStep;

  return (
    <AuthBackground>
      <AuthModeToggle />
      <AuthScreenFrame>
        <Stack spacing={1.45}>
          <Stack spacing={1.1} sx={{ alignItems: 'center', pt: 0.5 }}>
            <AuthLogo />
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, textAlign: 'center', color: 'text.primary' }}
            >
              {t('mweb.signup.title')}{' '}
              <Box component="span" sx={{ color: auth.accent }}>
                {t('mweb.signup.titleAccent')}
              </Box>
            </Typography>
          </Stack>

          <SignupStepperRail step={flow.step} askingNumber={flow.askingNumber} />

          {onNumberStep && <WhatsappNumberStep onSubmit={flow.submitNumber} />}

          {onVerifyStep && flow.verifying && (
            <VerifyWhatsappStep
              extension={flow.verifying.extension}
              number={flow.verifying.number}
              email={flow.pendingEmail}
              creating={flow.creating}
              onVerified={flow.createAccount}
            />
          )}

          {showForm && (
            <>
              <GoogleSignInButton
                onCredential={google.start}
                loading={flow.creating}
                text="signup_with"
              />
              <GoogleSignupPolicyGate
                credential={google.credential}
                policies={policies}
                loading={policiesLoading}
                failed={policiesFailed}
                onAccepted={google.accept}
                onCancelled={google.cancel}
              />
              {google.error && (
                <Alert severity="error" sx={{ width: '100%' }}>
                  {google.error}
                </Alert>
              )}
              <Divider>{t('mweb.auth.orEmail')}</Divider>

              <RegisterForm
                step={flow.step}
                onStep={flow.setStep}
                initialValues={initialValues}
                errorMessage={flow.error}
                onSubmit={flow.submitForm}
              />
            </>
          )}
          <LegalLinks prefix={t('mweb.auth.legalSignUp')} />
        </Stack>
      </AuthScreenFrame>
    </AuthBackground>
  );
}
