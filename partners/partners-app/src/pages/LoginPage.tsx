import { gql, useMutation } from '@apollo/client';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import GoogleSignInButton from '../components/GoogleSignInButton';
import LoginForm, { type LoginFormValues } from '../forms/login.form';
import { parseApiError } from '../utils/parseApiError';
import { getSafeRedirectPath, redirectPathFromLocation, type RedirectLocation } from '../utils/redirect';
import { urlConfigs } from '../config/url-configs';

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

const Page = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: theme.spacing(3),
  background: `radial-gradient(1100px 520px at 8% -10%, ${theme.palette.primary.main}24, transparent 60%),
               radial-gradient(900px 480px at 108% 105%, ${theme.palette.secondary.main}22, transparent 60%),
               ${theme.palette.background.default}`,
}));

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
    <Page>
      <Card sx={{ width: '100%', maxWidth: 430 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
            <Box component="img" src="/duncit-logo.svg" alt="Duncit" sx={{ height: 64, width: 'auto', maxWidth: 240, objectFit: 'contain' }} />
            <Typography variant="h5">Partners Sign in</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Use your Duncit account to manage host and venue applications.
            </Typography>
          </Stack>
          <LoginForm loading={loading} errorMessage={error ? parseApiError(error) : null} onSubmit={handleLogin} submitLabel="Open partner console" />
          <Divider sx={{ my: 2 }}>OR</Divider>
          <GoogleSignInButton onCredential={handleGoogle} loading={googleLoading} text="signin_with" />
          {googleError && <Alert severity="error" sx={{ mt: 2 }}>{googleError}</Alert>}
          <Alert severity="info" sx={{ mt: 2 }}>
            New users can create an account from mWeb, then return to this partner console.
          </Alert>
          <Button fullWidth href={`${urlConfigs.mwebUrl}/register`} sx={{ mt: 1.5 }} variant="outlined">
            Create Duncit account
          </Button>
        </CardContent>
      </Card>
    </Page>
  );
}