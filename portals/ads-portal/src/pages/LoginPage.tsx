import { useMemo, useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoginScreen, type LoginFormValues, type LoginScreenConfig } from '@duncit/user-context';
import { appConfig } from '../config/app-config';
import { useBranding, useColorMode } from '@duncit/shell';
import { accessDeniedMessage, hasAppAccess, setToken } from '../lib/session';
import { parseApiError } from '../utils/parseApiError';
import { getSafeRedirectPath, redirectPathFromLocation, type RedirectLocation } from '../utils/redirect';

const LOGIN = gql`
  mutation ConsoleLogin($input: LoginInput!) {
    login(input: $input) {
      token
      user { user_id first_name last_name email roles }
    }
  }
`;

export default function LoginPage() {
  const [loginMutation, { loading }] = useMutation(LOGIN);
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
      '/'
    );
  };

  const handleLogin = async (values: LoginFormValues) => {
    setError(null);
    try {
      const res = await loginMutation({ variables: { input: { ...values, portal_key: appConfig.key } } });
      const data = res.data?.login;
      if (!data?.token) throw new Error('Login failed. Please try again.');
      if (!hasAppAccess(data?.user?.roles)) throw new Error(accessDeniedMessage());
      setToken(data.token);
      navigate(redirectAfterLogin(), { replace: true });
    } catch (err) {
      setError(parseApiError(err));
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
  };

  return (
    <LoginScreen
      config={config}
      mode={mode}
      onToggleMode={toggle}
      loading={loading}
      errorMessage={error || (deniedFromRedirect ? accessDeniedMessage() : null)}
      onSubmit={handleLogin}
    />
  );
}
