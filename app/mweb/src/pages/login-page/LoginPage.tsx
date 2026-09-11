import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useLocation, useNavigate } from 'react-router';
import { openGoogleSignup, type GoogleSignupHandoff } from '@duncit/utils';
import AuthBackground from '../../components/AuthBackground';
import { type LoginSubmitValues } from '../../forms/login';
import { useTranslation } from '../../i18n/useTranslation';
import { parseApiError } from '../../utils/parseApiError';
import {
  getSafeRedirectPath,
  postAuthPath,
  redirectPathFromLocation,
  type RedirectLocation,
} from '../../utils/redirect';
import { LINK_GOOGLE_ACCOUNT, LOGIN, LOGIN_GOOGLE } from './queries';
import GoogleLinkConsentDialog from './GoogleLinkConsentDialog';
import GoogleSignupInviteDialog from './GoogleSignupInviteDialog';
import LoginCard, { type LoginStep } from './LoginCard';
import { useOtpLogin } from './useOtpLogin';

export default function LoginPage() {
  const { t } = useTranslation();
  // Which half of the sign-in screen is showing. Kept in state rather than the
  // URL: it is a choice of method, not a place — a shared /login link should
  // always open on the options.
  const [step, setStep] = useState<LoginStep>('CHOOSE');
  const navigate = useNavigate();
  const location = useLocation();
  const [loginMutation, { loading, error }] = useMutation<any>(LOGIN);
  const [loginGoogle, { loading: gLoading }] = useMutation<any>(LOGIN_GOOGLE);
  const [linkGoogle, { loading: linking }] = useMutation<any>(LINK_GOOGLE_ACCOUNT);
  const [gError, setGError] = useState<string | null>(null);
  /*
    A Google credential Duncit has no account for. Held — unspent — so accepting
    the invite carries it into signup rather than asking Google for a second
    one, and kept through `openGoogleSignup` so a repeat of the SAME credential
    lands on the invite already open instead of swapping it underneath.
  */
  const [invite, setInvite] = useState<GoogleSignupHandoff | null>(null);
  /*
    Google renders its own button, and it stays pressable underneath our
    spinner overlay. A second press during the exchange would put two
    loginWithGoogle calls in the air, and for a brand-new account that is two
    invites — and, if both are answered, two runs at making one account. One
    exchange at a time; a ref rather than state because the guard has to hold
    within the tick, before any re-render.
  */
  const exchanging = useRef(false);
  // The pending consent grant. Holds the id_token loginWithGoogle just refused
  // so "Allow" can spend it on linkGoogleAccount without a second Google round
  // trip — Google id tokens stay valid for an hour, far longer than this step.
  const [consent, setConsent] = useState<{ idToken: string; email: string } | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);

  const finishLogin = (token: string, user: any) => {
    localStorage.setItem('token', token);
    const params = new URLSearchParams(location.search);
    const stateFrom = (location.state as { from?: RedirectLocation } | null)?.from;
    const redirect =
      getSafeRedirectPath(params.get('redirect')) ||
      getSafeRedirectPath(stateFrom ? redirectPathFromLocation(stateFrom) : '');
    navigate(postAuthPath(user?.onboarding_survey_completed !== false, redirect), {
      replace: true,
    });
  };

  // Continue with OTP shares the same landing: a correct code hands its token
  // to the same finishLogin every other method spends.
  const otp = useOtpLogin(finishLogin);
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
      if (token) finishLogin(token, res.data?.login?.user);
    } catch (e) {
      throw new Error(parseApiError(e));
    }
  };

  const handleGoogle = async (idToken: string) => {
    if (exchanging.current) return;
    exchanging.current = true;
    setGError(null);
    try {
      const res = await loginGoogle({ variables: { input: { id_token: idToken } } });
      const token = res.data?.loginWithGoogle?.token;
      if (token) finishLogin(token, res.data?.loginWithGoogle?.user);
    } catch (e: any) {
      const code = e.graphQLErrors?.[0]?.extensions?.code;
      if (code === 'GOOGLE_ACCOUNT_NOT_FOUND') {
        // Not a dead end either — Google has verified this address and nobody
        // holds it here, so we offer to make the account rather than turning
        // them away with a credential we are about to throw out.
        const verified = e.graphQLErrors?.[0]?.extensions?.email as string | undefined;
        setInvite((current) => openGoogleSignup(current, idToken, verified ?? ''));
      } else if (code === 'EMAIL_LOGIN_REQUIRED') {
        // Not a dead end any more — the account exists and Google has verified
        // this address, so we ask whether to grant Google sign-in to it.
        const matched = e.graphQLErrors?.[0]?.extensions?.email as string | undefined;
        setConsentError(null);
        setConsent({ idToken, email: matched ?? '' });
      } else {
        setGError(parseApiError(e));
      }
    } finally {
      exchanging.current = false;
    }
  };

  /*
    Yes to the invite: carry the credential into signup.

    In router state rather than the query string — an id_token in the URL is an
    id_token in the history, in the referrer of everything the page loads, and
    in every access log the address reaches. Clearing the invite first is what
    makes a double press idempotent here; the signup screen claims what arrives
    exactly once, which is what makes it idempotent there too.
  */
  const acceptGoogleInvite = () => {
    if (!invite) return;
    setInvite(null);
    navigate('/register', { state: { googleSignup: invite } });
  };

  const allowGoogleLink = async () => {
    if (!consent) return;
    setConsentError(null);
    try {
      const res = await linkGoogle({ variables: { input: { id_token: consent.idToken } } });
      const token = res.data?.linkGoogleAccount?.token;
      if (token) {
        setConsent(null);
        finishLogin(token, res.data?.linkGoogleAccount?.user);
      }
    } catch (e) {
      // Kept open with the reason: closing would look like the grant worked.
      setConsentError(parseApiError(e));
    }
  };

  // Denying changes nothing about the account. Back to the form with a warning
  // that says both what happened and how to get here again.
  const denyGoogleLink = () => {
    setConsent(null);
    setConsentError(null);
    setGError(t('mweb.login.linkConsentDenied'));
  };

  return (
    <AuthBackground>
      <LoginCard
        otp={otp}
        step={step}
        onStep={setStep}
        loading={loading}
        errorMessage={error ? parseApiError(error) : null}
        onSubmit={handleSubmit}
        gLoading={gLoading}
        gError={gError}
        onGoogleCredential={handleGoogle}
      />

      <GoogleLinkConsentDialog
        open={!!consent}
        email={consent?.email ?? ''}
        busy={linking}
        error={consentError}
        onAllow={() => {
          allowGoogleLink().catch(() => undefined);
        }}
        onDeny={denyGoogleLink}
      />

      <GoogleSignupInviteDialog
        open={!!invite}
        email={invite?.email ?? ''}
        onAccept={acceptGoogleInvite}
        onDismiss={() => setInvite(null)}
      />
    </AuthBackground>
  );
}
