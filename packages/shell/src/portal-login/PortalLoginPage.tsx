import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useLocation, useNavigate } from 'react-router';
import { useColorMode } from '@duncit/theme';
import { parseApiError } from '@duncit/utils';
import { LoginScreen, type LoginFormValues, type LoginScreenConfig } from '@duncit/user-context';
import { useTranslation } from '../i18n/useTranslation';
import { useBranding } from '../hooks/useBranding';
import { getSafeRedirectPath, redirectPathFromLocation } from '../lib/redirect';
import OtpLoginPanel from './OtpLoginPanel';
import TwoFactorLoginDialog from './TwoFactorLoginDialog';
import { useTwoFactorLogin } from './useTwoFactorLogin';
import { REQUEST_OTP, buildLoginMutation, buildOtpLoginMutation, type SessionPayload } from './login-documents';
import type { PortalLoginPageProps, RedirectLocation } from './portal-login.types';

const LOGIN_FAILED_MESSAGE = 'Login failed. Please try again.';
const NO_EXTRA_FIELDS: readonly string[] = [];

/**
 * The login page every Duncit console previously hand-rolled: ConsoleLogin
 * mutation (with `portal_key`), role gate + `?denied=1` banner, token write and
 * safe `?redirect=` / router-state redirect around the shared `LoginScreen`.
 */
export default function PortalLoginPage({
  appConfig,
  session,
  defaultRedirect = '/',
  mutationName = 'ConsoleLogin',
  extraUserFields = NO_EXTRA_FIELDS,
  skipAccessGate = false,
  footerSlot,
  parseError,
  configOverrides,
}: Readonly<PortalLoginPageProps>) {
  const { t } = useTranslation();
  const loginDocument = useMemo(
    () => buildLoginMutation(mutationName, extraUserFields),
    [mutationName, extraUserFields],
  );
  const otpLoginDocument = useMemo(() => buildOtpLoginMutation(extraUserFields), [extraUserFields]);
  const [loginMutation, { loading }] = useMutation<any>(loginDocument);
  const [requestOtp, { loading: sendingOtp }] = useMutation<any>(REQUEST_OTP);
  const [otpLogin, { loading: verifyingOtp }] = useMutation<any>(otpLoginDocument);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const { mode, toggle } = useColorMode();
  const { logoUrl, onLogoError, termsUrl, privacyUrl } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();

  const deniedFromRedirect = useMemo(
    () => new URLSearchParams(location.search).get('denied') === '1',
    [location.search],
  );

  const redirectAfterLogin = () => {
    const params = new URLSearchParams(location.search);
    const stateFrom = (location.state as { from?: RedirectLocation } | null)?.from;
    return (
      getSafeRedirectPath(params.get('redirect')) ||
      getSafeRedirectPath(stateFrom ? redirectPathFromLocation(stateFrom) : '') ||
      defaultRedirect
    );
  };

  const resolveErrorMessage = parseError ?? parseApiError;

  /*
    What a successful login DOES, once something has produced a payload.

    Shared by both doors: a code is not a lesser credential, so it must pass the
    same role gate and write the same token to the same place. Two copies of
    this is how one of them ends up skipping the gate.
  */
  const acceptSession = (data?: SessionPayload | null) => {
    if (!data?.token) throw new Error(LOGIN_FAILED_MESSAGE);
    if (!skipAccessGate && !session.hasAppAccess(data.user?.roles)) {
      throw new Error(session.accessDeniedMessage(t));
    }
    session.setToken(data.token);
    navigate(redirectAfterLogin(), { replace: true });
  };

  // Either door may answer "now the authenticator code" instead of a session.
  const twoFactor = useTwoFactorLogin({
    extraUserFields,
    onSession: acceptSession,
    onExpired: setError,
    resolveError: resolveErrorMessage,
  });

  const handleLogin = async (values: LoginFormValues) => {
    setError(null);
    try {
      const res = await loginMutation({
        variables: { input: { ...values, portal_key: appConfig.key } },
      });
      acceptSession(res.data?.login);
    } catch (err) {
      if (!twoFactor.intercept(err)) setError(resolveErrorMessage(err));
    }
  };

  const handleRequestCode = async (email: string) => {
    setOtpError(null);
    try {
      await requestOtp({ variables: { input: { email, portal_key: appConfig.key } } });
    } catch (err) {
      setOtpError(resolveErrorMessage(err));
      throw err;
    }
  };

  const handleSubmitCode = async (email: string, otp: string) => {
    setOtpError(null);
    try {
      const res = await otpLogin({
        variables: { input: { email, otp, portal_key: appConfig.key } },
      });
      acceptSession(res.data?.loginWithPortalOtp);
    } catch (err) {
      if (!twoFactor.intercept(err)) setOtpError(resolveErrorMessage(err));
    }
  };

  // The login screen renders before there is a session, so the copy comes from
  // the bundled fallback until the public catalogue query answers — which is
  // exactly what rule 38 wants the fallback to be for.
  const text = (key: string | undefined, literal: string) => (key ? t(key) : literal);

  const config: LoginScreenConfig = {
    brandName: appConfig.fullName,
    portalName: appConfig.name,
    tagline: text(appConfig.taglineKey, appConfig.tagline),
    promoTitle: text(appConfig.promoTitleKey, appConfig.promoTitle),
    promoText: text(appConfig.promoTextKey, appConfig.promoText),
    bgImage: appConfig.loginImage,
    logoUrl,
    onLogoError,
    termsUrl,
    privacyUrl,
    ...configOverrides,
  };

  let deniedMessage: string | null = null;
  if (!skipAccessGate && deniedFromRedirect) {
    deniedMessage = session.accessDeniedMessage(t);
  }

  return (
    <>
      <LoginScreen
        config={config}
        t={t}
        mode={mode}
        onToggleMode={toggle}
        loading={loading}
        errorMessage={error ?? deniedMessage}
        onSubmit={handleLogin}
        altSlot={
          <OtpLoginPanel
            onRequestCode={handleRequestCode}
            onSubmitCode={handleSubmitCode}
            busy={sendingOtp || verifyingOtp}
            errorMessage={otpError}
          />
        }
        footerSlot={footerSlot}
      />
      <TwoFactorLoginDialog
        open={twoFactor.open}
        busy={twoFactor.busy}
        onSubmit={twoFactor.submit}
        onCancel={twoFactor.cancel}
      />
    </>
  );
}
