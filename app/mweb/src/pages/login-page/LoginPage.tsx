import { useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { useLocation, useNavigate } from 'react-router';
import {
  claimGoogleSignupHandoff,
  createGoogleSignupClaims,
  readGoogleSignupHandoff,
} from '@duncit/utils';
import AuthBackground from '../../components/AuthBackground';
import { type LoginSubmitValues } from '../../forms/login';
import { parseApiError } from '../../utils/parseApiError';
import { LOGIN } from './queries';
import { useFinishLogin } from './useFinishLogin';
import GoogleLinkConsentDialog from './GoogleLinkConsentDialog';
import GoogleSignupInviteDialog from './GoogleSignupInviteDialog';
import LoginCard, { type LoginStep } from './LoginCard';
import { useOtpLogin } from './useOtpLogin';
import { useSocialLogin } from './useSocialLogin';

/** Which carried credential this tab has already logged in with — module scope
 * so it outlives the remount it guards against (see RegisterPage's twin). */
const CLAIMS = createGoogleSignupClaims();

/** Where each part of the sign-in screen lives, so Back leaves a method for the options. */
const STEP_PATH: Record<LoginStep, string> = {
  CHOOSE: '/login',
  PASSWORD: '/login/with-password',
  OTP: '/login/with-otp',
};

const stepOf = (pathname: string): LoginStep =>
  (Object.keys(STEP_PATH) as LoginStep[]).find((step) => STEP_PATH[step] === pathname.replace(/\/$/, '')) ??
  'CHOOSE';

export default function LoginPage() {
  // Which part of the sign-in screen is showing comes from the URL: choosing a
  // method pushes its path, so the browser's Back returns to the options rather
  // than leaving the app. A `?redirect` rides along on every step.
  const location = useLocation();
  const navigate = useNavigate();
  const step = stepOf(location.pathname);
  const setStep = (next: LoginStep) => {
    if (next === step) return;
    // Back to the options: pop the method we pushed, so history keeps one /login;
    // a method opened straight from a link has nothing to pop, so it is replaced.
    if (next === 'CHOOSE' && (location.state as { fromChooser?: boolean } | null)?.fromChooser) {
      navigate(-1);
      return;
    }
    navigate(
      { pathname: STEP_PATH[next], search: location.search },
      next === 'CHOOSE' ? { replace: true } : { state: { fromChooser: true } },
    );
  };
  const [loginMutation, { loading, error }] = useMutation<any>(LOGIN);
  const { finishLogin, starting } = useFinishLogin();

  // Continue with OTP shares the same landing: a correct code hands its token
  // to the same finishLogin every other method spends.
  const otp = useOtpLogin(finishLogin);
  // Google and Apple: one door, the same consent step and signup invite.
  const social = useSocialLogin(finishLogin);

  /*
    Arrived from signup's "you're already on Duncit — log in?", holding the
    credential the provider had already returned: spend it on the login here,
    where every answer it can get (session, link consent, two-factor) is handled.
    Claimed, so a reload or a back-and-forward cannot replay it.
  */
  const carried = readGoogleSignupHandoff(
    (location.state as { socialLogin?: unknown } | null)?.socialLogin,
  );
  const carriedToken = carried?.idToken ?? '';
  useEffect(() => {
    const claimed = claimGoogleSignupHandoff(CLAIMS, carried);
    if (claimed) {
      social.start({ provider: claimed.provider ?? 'GOOGLE', idToken: claimed.idToken }).catch(() => undefined);
    }
    // Keyed by the credential itself; the claim guards the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carriedToken]);

  const handleSubmit = async (values: LoginSubmitValues) => {
    try {
      /*
        Only the chosen channel travels. Sending a blank email alongside a
        phone number makes the server's per-channel validator argue with a
        box nobody filled in — the same reason recoveryLookup exists.
      */
      const input =
        values.channel === 'PHONE'
          ? {
              channel: 'PHONE' as const,
              phone_extension: values.phoneExtension.trim(),
              phone_number: values.phoneNumber.trim(),
              password: values.password,
            }
          : {
              channel: 'EMAIL' as const,
              email: values.email.trim().toLowerCase(),
              password: values.password,
            };
      const res = await loginMutation({ variables: { input } });
      const token = res.data?.login?.token;
      if (token) await finishLogin(token, res.data?.login?.user);
    } catch (e) {
      throw new Error(parseApiError(e));
    }
  };

  return (
    <AuthBackground>
      <LoginCard
        otp={otp}
        step={step}
        onStep={setStep}
        loading={loading || starting}
        errorMessage={error ? parseApiError(error) : null}
        onSubmit={handleSubmit}
        socialLoading={social.busy || starting}
        socialError={social.error}
        onSocialCredential={(credential) => {
          social.start(credential).catch(() => undefined);
        }}
        onSocialError={social.setError}
      />

      <GoogleLinkConsentDialog
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

      <GoogleSignupInviteDialog
        open={!!social.invite}
        provider={social.invite?.provider ?? 'GOOGLE'}
        email={social.invite?.email ?? ''}
        onAccept={social.acceptInvite}
        onDismiss={social.dismissInvite}
      />
    </AuthBackground>
  );
}
