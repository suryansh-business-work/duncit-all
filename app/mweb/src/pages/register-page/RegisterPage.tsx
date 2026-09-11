import { useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import {
  claimGoogleSignupHandoff,
  createGoogleSignupClaims,
  readGoogleSignupHandoff,
  readReferralCode,
} from '@duncit/utils';
import { Alert, Divider, Link, Stack, Typography } from '@mui/material';
import AuthBackground from '../../components/AuthBackground';
import AuthHeading from '../../components/AuthHeading';
import AuthScreenFrame from '../../components/AuthScreenFrame';
import LegalLinks from '../../components/LegalLinks';
import { useTranslation } from '../../i18n/useTranslation';
import { useGoogleSignup } from '../../hooks/useGoogleSignup';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import { GoogleSignupPolicyGate, useSignupPolicies } from '../../components/policy-acceptance';
import { RegisterForm, registerDefaults } from '../../forms/register';
import SignupStepperRail from './SignupStepperRail';
import GoogleDetailsStep from './GoogleDetailsStep';
import VerifyWhatsappStep from './VerifyWhatsappStep';
import { useSignupFlow } from './useSignupFlow';

/**
 * Join Duncit — four steps.
 *
 * The first three collect the answers and are the form's; the fourth proves the
 * WhatsApp number and is this page's — and it is the one that creates the
 * account, with the proof beside the answers. Nothing exists before it, so
 * there is nothing to leave behind by closing the tab: the step cannot be
 * skipped because there is no account to skip it with.
 *
 * Google is the same four steps with the first three answered for it — so it
 * lands straight on the last one, where it has to ask for the number and the
 * date of birth (a Google credential carries neither) before it can ask for the
 * code. What each door does is `useSignupFlow`'s; this file is the view.
 *
 * RN twin: app/mobile-app/src/screens/SignupScreen.
 */
/**
 * Which carried credential this tab has already opened the Google door with.
 *
 * Module scope on purpose: it has to outlive the page, because the replay it
 * guards against is a SECOND mount reading the same router state — a reload, or
 * a trip back to login and forward again. A ref would be reset by exactly the
 * event it exists to survive.
 */
const CLAIMS = createGoogleSignupClaims();

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

  /*
    Arrived from the login screen's "no Duncit account yet" invite, holding the
    credential Google had already returned — so this door opens on the
    acceptance gate with it in hand rather than on a Google button they have
    just pressed.

    CLAIMED, not read. Router state outlives the navigation that carried it: a
    reload replays it, and going back to login and forward again replays it too.
    Starting the Google door a second time would reopen the acceptance gate on
    top of the number and code steps already running, and the credential behind
    it is the one thing that must be spent once. The claim answers once per
    credential, which is what makes re-running this a no-op instead.
  */
  const location = useLocation();
  const carried = readGoogleSignupHandoff(
    (location.state as { googleSignup?: unknown } | null)?.googleSignup,
  );
  const carriedToken = carried?.idToken ?? '';
  useEffect(() => {
    const claimed = claimGoogleSignupHandoff(CLAIMS, carried);
    if (claimed) google.start(claimed.idToken);
    // Keyed by the credential itself; the claim guards the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carriedToken]);

  const onNumberStep = flow.askingNumber;
  const onVerifyStep = flow.step === 'VERIFY' && flow.verifying !== null;
  // Decided above the JSX (S3358): the two doors reach the same code step from
  // different places, and only the form door still has a form to show.
  const showForm = !onNumberStep && !onVerifyStep;

  return (
    <AuthBackground>
      <AuthScreenFrame>
        <Stack spacing={3}>
          <AuthHeading title={t('mweb.signup.title')} accent={t('mweb.signup.titleAccent')} />

          <Stack spacing={2}>
            <SignupStepperRail step={flow.step} askingNumber={flow.askingNumber} />

            {onNumberStep && <GoogleDetailsStep onSubmit={flow.submitDetails} />}

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
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              {t('mweb.signup.haveAccount')}{' '}
              <Link component={RouterLink} to="/login" underline="hover" data-testid="go-login">
                {t('mweb.signup.logIn')}
              </Link>
            </Typography>
            <LegalLinks prefix={t('mweb.auth.legalSignUp')} />
          </Stack>
        </Stack>
      </AuthScreenFrame>
    </AuthBackground>
  );
}
