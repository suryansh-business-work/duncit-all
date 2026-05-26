import { useMemo, useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Divider } from '@mui/material';
import { appConfig } from '../config/app-config';
import { accessDeniedMessage, hasAppAccess, setToken } from '../lib/session';
import { parseApiError } from '../utils/parseApiError';
import { getSafeRedirectPath, redirectPathFromLocation, type RedirectLocation } from '../utils/redirect';
import { LoginForm, type LoginFormValues } from '../forms/login';
import AuthSplitLayout from '../components/AuthSplitLayout';
import GoogleSignInButton from '../components/GoogleSignInButton';

const LOGIN = gql`
  mutation ConsoleLogin($input: LoginInput!) {
    login(input: $input) {
      token
      user { user_id first_name last_name email roles }
    }
  }
`;

const LOGIN_GOOGLE = gql`
  mutation ConsoleLoginWithGoogle($input: GoogleAuthInput!) {
    loginWithGoogle(input: $input) {
      token
      user { user_id first_name last_name email roles }
    }
  }
`;

export default function LoginPage() {
  const [loginMutation, { loading }] = useMutation(LOGIN);
  const [loginGoogle, { loading: googleLoading }] = useMutation(LOGIN_GOOGLE);
  const [googleError, setGoogleError] = useState<string | null>(null);
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

  const completeLogin = (token: string, roles?: readonly string[] | null) => {
    if (!token) throw new Error('Login failed. Please try again.');
    if (!hasAppAccess(roles)) throw new Error(accessDeniedMessage());
    setToken(token);
    navigate(redirectAfterLogin(), { replace: true });
  };

  const handleLogin = async (values: LoginFormValues) => {
    try {
      const res = await loginMutation({ variables: { input: values } });
      const data = res.data?.login;
      completeLogin(data?.token, data?.user?.roles);
    } catch (err) {
      throw new Error(parseApiError(err));
    }
  };

  const handleGoogle = async (idToken: string) => {
    setGoogleError(null);
    try {
      const res = await loginGoogle({ variables: { input: { id_token: idToken } } });
      const data = res.data?.loginWithGoogle;
      completeLogin(data?.token, data?.user?.roles);
    } catch (err: any) {
      const code = err.graphQLErrors?.[0]?.extensions?.code;
      setGoogleError(
        code === 'GOOGLE_ACCOUNT_NOT_FOUND'
          ? 'Google account not found. Ask an administrator to create your Duncit account first.'
          : parseApiError(err)
      );
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
      <Divider sx={{ my: 2 }}>OR</Divider>
      <GoogleSignInButton onCredential={handleGoogle} loading={googleLoading} text="signin_with" />
      {googleError && <Alert severity="error" sx={{ mt: 2 }}>{googleError}</Alert>}
    </AuthSplitLayout>
  );
}
