import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthBackground from '../../components/AuthBackground';
import AuthModeToggle from '../../components/AuthModeToggle';
import GoogleAuthNoticeDialog from '../../components/GoogleAuthNoticeDialog';
import { type LoginFormValues } from '../../forms/login';
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
import LoginCard from './LoginCard';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginMutation, { loading, error }] = useMutation<any>(LOGIN);
  const [loginGoogle, { loading: gLoading }] = useMutation<any>(LOGIN_GOOGLE);
  const [linkGoogle, { loading: linking }] = useMutation<any>(LINK_GOOGLE_ACCOUNT);
  const [gError, setGError] = useState<string | null>(null);
  const [gNotice, setGNotice] = useState<{
    title: string;
    message: string;
    action?: string;
  } | null>(null);
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

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      const res = await loginMutation({ variables: { input: values } });
      const token = res.data?.login?.token;
      if (token) finishLogin(token, res.data?.login?.user);
    } catch (e) {
      throw new Error(parseApiError(e));
    }
  };

  const handleGoogle = async (idToken: string) => {
    setGError(null);
    try {
      const res = await loginGoogle({ variables: { input: { id_token: idToken } } });
      const token = res.data?.loginWithGoogle?.token;
      if (token) finishLogin(token, res.data?.loginWithGoogle?.user);
    } catch (e: any) {
      const code = e.graphQLErrors?.[0]?.extensions?.code;
      if (code === 'GOOGLE_ACCOUNT_NOT_FOUND') {
        setGNotice({
          title: t('mweb.login.googleNotFoundTitle'),
          message: t('mweb.login.googleNotFoundBody'),
          action: t('mweb.login.googleNotFoundAction'),
        });
      } else if (code === 'EMAIL_LOGIN_REQUIRED') {
        // Not a dead end any more — the account exists and Google has verified
        // this address, so we ask whether to grant Google sign-in to it.
        const matched = e.graphQLErrors?.[0]?.extensions?.email as string | undefined;
        setConsentError(null);
        setConsent({ idToken, email: matched ?? '' });
      } else {
        setGError(parseApiError(e));
      }
    }
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
      <AuthModeToggle />

      <LoginCard
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

      <GoogleAuthNoticeDialog
        open={!!gNotice}
        title={gNotice?.title ?? ''}
        message={gNotice?.message ?? ''}
        actionLabel={gNotice?.action}
        onAction={() => navigate('/register')}
        onClose={() => setGNotice(null)}
      />
    </AuthBackground>
  );
}
