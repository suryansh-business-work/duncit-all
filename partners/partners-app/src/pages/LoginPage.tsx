import { gql, useMutation } from '@apollo/client';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Divider } from '@mui/material';
import GoogleSignInButton from '../components/GoogleSignInButton';
import LoginForm, { type LoginFormValues } from '../forms/login.form';
import { parseApiError } from '../utils/parseApiError';
import { getSafeRedirectPath, redirectPathFromLocation, type RedirectLocation } from '../utils/redirect';
import { urlConfigs } from '../config/url-configs';
import AuthSplitLayout from '../components/AuthSplitLayout';

const PARTNERS_LOGIN_IMAGE =
  (import.meta.env.VITE_LOGIN_IMAGE as string | undefined) ||
  'https://images.pexels.com/photos/4963388/pexels-photo-4963388.jpeg';

const LOGIN = gql`
  mutation PartnerLogin($input: LoginInput!) {
    login(input: $input) {
      token
      user { user_id first_name last_name email roles onboarding_survey_completed }
    }
  }
`;

const LOGIN_GOOGLE = gql`
  mutation PartnerLoginWithGoogle($input: GoogleAuthInput!) {
    loginWithGoogle(input: $input) {
      token
      user { user_id first_name last_name email roles onboarding_survey_completed }
    }
  }
`;

export default function LoginPage() {
  const [loginMutation, { loading, error }] = useMutation(LOGIN);
  const [loginGoogle, { loading: googleLoading }] = useMutation(LOGIN_GOOGLE);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectAfterLogin = () => {
    const params = new URLSearchParams(location.search);
    const stateFrom = (location.state as { from?: RedirectLocation } | null)?.from;
    return getSafeRedirectPath(params.get('redirect')) || getSafeRedirectPath(stateFrom ? redirectPathFromLocation(stateFrom) : '') || '/';
  };

  const handleLogin = async (values: LoginFormValues) => {
    try {
      const res = await loginMutation({ variables: { input: values } });
      const token = res.data?.login?.token;
      if (!token) throw new Error('Login failed. Please try again.');
      localStorage.setItem('token', token);
      navigate(redirectAfterLogin(), { replace: true });
    } catch (err) {
      throw new Error(parseApiError(err));
    }
  };

  const handleGoogle = async (idToken: string) => {
    setGoogleError(null);
    try {
      const res = await loginGoogle({ variables: { input: { id_token: idToken } } });
      const token = res.data?.loginWithGoogle?.token;
      if (!token) throw new Error('Google login failed. Please try again.');
      localStorage.setItem('token', token);
      navigate(redirectAfterLogin(), { replace: true });
    } catch (err: any) {
      const code = err.graphQLErrors?.[0]?.extensions?.code;
      setGoogleError(code === 'GOOGLE_ACCOUNT_NOT_FOUND' ? 'Google account not found. Create your Duncit account from mWeb first.' : parseApiError(err));
    }
  };

  return (
    <AuthSplitLayout
      title="Partners Sign in"
      subtitle="Use your Duncit account to manage host and venue applications."
      portalLabel="Partners Portal"
      fullName="Duncit Partners"
      tagline="Onboard, manage and grow your hosts and venues with the Duncit Partners console."
      loginImage={PARTNERS_LOGIN_IMAGE}
    >
      <LoginForm
        loading={loading}
        errorMessage={error ? parseApiError(error) : null}
        onSubmit={handleLogin}
        submitLabel="Open partner console"
      />
      <Divider sx={{ my: 2 }}>OR</Divider>
      <GoogleSignInButton onCredential={handleGoogle} loading={googleLoading} text="signin_with" />
      {googleError && <Alert severity="error" sx={{ mt: 2 }}>{googleError}</Alert>}
      <Alert severity="info" sx={{ mt: 2 }}>
        New users can create an account from mWeb, then return to this partner console.
      </Alert>
      <Button fullWidth href={`${urlConfigs.mwebUrl}/register`} sx={{ mt: 1.5 }} variant="outlined">
        Create Duncit account
      </Button>
    </AuthSplitLayout>
  );
}
