import { useMemo } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';
import { appConfig } from '../config/app-config';
import { accessDeniedMessage, hasAppAccess, setToken } from '../lib/session';
import { parseApiError } from '../utils/parseApiError';
import { getSafeRedirectPath, redirectPathFromLocation, type RedirectLocation } from '../utils/redirect';
import { LoginForm, type LoginFormValues } from '../forms/login';
import AuthSplitLayout from '../components/AuthSplitLayout';

const LOGIN = gql`
  mutation ConsoleLogin($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        user_id
        first_name
        last_name
        email
        roles
      }
    }
  }
`;

export default function LoginPage() {
  const [loginMutation, { loading }] = useMutation(LOGIN);
  const navigate = useNavigate();
  const location = useLocation();

  const deniedFromRedirect = useMemo(
    () => new URLSearchParams(location.search).get('denied') === '1',
    [location.search]
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
    try {
      const res = await loginMutation({ variables: { input: values } });
      const data = res.data?.login;
      if (!data?.token) throw new Error('Login failed. Please try again.');
      if (!hasAppAccess(data.user?.roles)) {
        throw new Error(accessDeniedMessage());
      }
      setToken(data.token);
      navigate(redirectAfterLogin(), { replace: true });
    } catch (err) {
      throw new Error(parseApiError(err));
    }
  };

  return (
    <AuthSplitLayout
      title={`Sign in to ${appConfig.fullName}`}
      subtitle={`${appConfig.tagline} Use your Duncit account to continue.`}
    >
      {deniedFromRedirect && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {accessDeniedMessage()}
        </Alert>
      )}
      <LoginForm loading={loading} onSubmit={handleLogin} submitLabel={`Open ${appConfig.name} console`} />
    </AuthSplitLayout>
  );
}
