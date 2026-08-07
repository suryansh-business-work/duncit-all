import { useMemo, useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { useColorMode } from '@duncit/theme';
import { parseApiError } from '@duncit/utils';
import { LoginScreen, type LoginFormValues, type LoginScreenConfig } from '@duncit/user-context';
import { useBranding } from '../hooks/useBranding';
import { getSafeRedirectPath, redirectPathFromLocation } from '../lib/redirect';
import OtpLoginPanel from './OtpLoginPanel';
import type { PortalLoginPageProps, RedirectLocation } from './portal-login.types';

const LOGIN_FAILED_MESSAGE = 'Login failed. Please try again.';
const BASE_USER_FIELDS = 'user_id first_name last_name email roles';
const NO_EXTRA_FIELDS: readonly string[] = [];

function buildLoginMutation(mutationName: string, extraUserFields: readonly string[]) {
  const extra = extraUserFields.length ? ` ${extraUserFields.join(' ')}` : '';
  return gql(`
    mutation ${mutationName}($input: LoginInput!) {
      login(input: $input) {
        token
        user { ${BASE_USER_FIELDS}${extra} }
      }
    }
  `);
}

/** The same session a password produces, from a code instead. */
function buildOtpLoginMutation(extraUserFields: readonly string[]) {
  const extra = extraUserFields.length ? ` ${extraUserFields.join(' ')}` : '';
  return gql(`
    mutation ConsoleOtpLogin($input: PortalLoginOtpInput!) {
      loginWithPortalOtp(input: $input) {
        token
        user { ${BASE_USER_FIELDS}${extra} }
      }
    }
  `);
}

const REQUEST_OTP = gql(`
  mutation ConsoleRequestLoginOtp($input: PortalLoginOtpRequestInput!) {
    requestPortalLoginOtp(input: $input) {
      ok
    }
  }
`);

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
  const loginDocument = useMemo(
    () => buildLoginMutation(mutationName, extraUserFields),
    [mutationName, extraUserFields],
  );
  const otpLoginDocument = useMemo(() => buildOtpLoginMutation(extraUserFields), [extraUserFields]);
  const [loginMutation, { loading }] = useMutation(loginDocument);
  const [requestOtp, { loading: sendingOtp }] = useMutation(REQUEST_OTP);
  const [otpLogin, { loading: verifyingOtp }] = useMutation(otpLoginDocument);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const { mode, toggle } = useColorMode();
  const { logoUrl, onLogoError } = useBranding();
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
  const acceptSession = (data?: { token?: string; user?: { roles?: string[] } } | null) => {
    if (!data?.token) throw new Error(LOGIN_FAILED_MESSAGE);
    if (!skipAccessGate && !session.hasAppAccess(data.user?.roles)) {
      throw new Error(session.accessDeniedMessage());
    }
    session.setToken(data.token);
    navigate(redirectAfterLogin(), { replace: true });
  };

  const handleLogin = async (values: LoginFormValues) => {
    setError(null);
    try {
      const res = await loginMutation({
        variables: { input: { ...values, portal_key: appConfig.key } },
      });
      acceptSession(res.data?.login);
    } catch (err) {
      setError(resolveErrorMessage(err));
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
      setOtpError(resolveErrorMessage(err));
    }
  };

  const config: LoginScreenConfig = {
    brandName: appConfig.fullName,
    portalName: appConfig.name,
    tagline: appConfig.tagline,
    promoTitle: appConfig.promoTitle,
    promoText: appConfig.promoText,
    bgImage: appConfig.loginImage,
    logoUrl,
    onLogoError,
    ...configOverrides,
  };

  let deniedMessage: string | null = null;
  if (!skipAccessGate && deniedFromRedirect) {
    deniedMessage = session.accessDeniedMessage();
  }

  return (
    <LoginScreen
      config={config}
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
  );
}
