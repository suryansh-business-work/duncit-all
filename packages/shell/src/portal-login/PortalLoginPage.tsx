import { useMemo, useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { useColorMode } from '@duncit/theme';
import { parseApiError } from '@duncit/utils';
import { LoginScreen, type LoginFormValues, type LoginScreenConfig } from '@duncit/user-context';
import { useBranding } from '../hooks/useBranding';
import { getSafeRedirectPath, redirectPathFromLocation } from '../lib/redirect';
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
  const [loginMutation, { loading }] = useMutation(loginDocument);
  const [error, setError] = useState<string | null>(null);
  const { mode, toggle } = useColorMode();
  const { logoUrl } = useBranding();
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

  const handleLogin = async (values: LoginFormValues) => {
    setError(null);
    try {
      const res = await loginMutation({
        variables: { input: { ...values, portal_key: appConfig.key } },
      });
      const data = res.data?.login;
      if (!data?.token) throw new Error(LOGIN_FAILED_MESSAGE);
      if (!skipAccessGate && !session.hasAppAccess(data.user?.roles)) {
        throw new Error(session.accessDeniedMessage());
      }
      session.setToken(data.token);
      navigate(redirectAfterLogin(), { replace: true });
    } catch (err) {
      setError(resolveErrorMessage(err));
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
      footerSlot={footerSlot}
    />
  );
}
