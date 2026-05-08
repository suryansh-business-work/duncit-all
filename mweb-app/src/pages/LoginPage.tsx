import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Divider,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
  keyframes,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useColorMode } from '../ColorModeContext';
import AuthBackground from '../components/AuthBackground';
import GoogleAuthNoticeDialog from '../components/GoogleAuthNoticeDialog';
import GoogleSignInButton from '../components/GoogleSignInButton';
import LoginForm, { type LoginFormValues } from '../forms/login.form';

const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user { user_id first_name email roles onboarding_survey_completed }
    }
  }
`;
const LOGIN_GOOGLE = gql`
  mutation LoginWithGoogle($input: GoogleAuthInput!) {
    loginWithGoogle(input: $input) {
      token
      user { user_id first_name email roles onboarding_survey_completed }
    }
  }
`;

const fadeUp = keyframes`
  0%   { opacity: 0; transform: translateY(18px); }
  100% { opacity: 1; transform: translateY(0); }
`;
const logoIn = keyframes`
  0%   { opacity: 0; transform: scale(0.7); }
  60%  { opacity: 1; transform: scale(1.06); }
  100% { transform: scale(1); }
`;

export default function LoginPage() {
  const navigate = useNavigate();
  const colorMode = useColorMode();
  const [loginMutation, { loading, error }] = useMutation(LOGIN);
  const [loginGoogle, { loading: gLoading }] = useMutation(LOGIN_GOOGLE);
  const [gError, setGError] = useState<string | null>(null);
  const [gNotice, setGNotice] = useState<{
    title: string;
    message: string;
    action?: string;
  } | null>(null);

  const finishLogin = (token: string, user: any) => {
    localStorage.setItem('token', token);
    navigate(user?.onboarding_survey_completed === false ? '/signup-survey' : '/');
  };

  const handleSubmit = async (values: LoginFormValues) => {
    const res = await loginMutation({ variables: { input: values } });
    const token = res.data?.login?.token;
    if (token) finishLogin(token, res.data?.login?.user);
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
          title: 'Google account not found',
          message: 'User is not in our system. Please sign up first.',
          action: 'Sign up',
        });
      } else if (code === 'EMAIL_LOGIN_REQUIRED') {
        setGNotice({
          title: 'Use email login',
          message:
            'Please login with email. You registered with us using email and password.',
        });
      } else {
        setGError(e.message);
      }
    }
  };

  return (
    <AuthBackground>
      <Tooltip title={`Switch to ${colorMode.mode === 'dark' ? 'light' : 'dark'} mode`}>
        <IconButton
          onClick={colorMode.toggle}
          sx={{
            position: 'fixed',
            top: 12,
            right: 12,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            zIndex: 10,
            '&:hover': { bgcolor: 'action.hover' },
          }}
          aria-label="Toggle dark mode"
        >
          {colorMode.mode === 'dark' ? (
            <LightModeIcon fontSize="small" />
          ) : (
            <DarkModeIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>

      <Card
        elevation={6}
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: '4px',
          backdropFilter: 'blur(8px)',
          bgcolor: 'rgba(255,255,255,0.92)',
          animation: `${fadeUp} 0.7s cubic-bezier(.2,.7,.2,1.2) both`,
          '& .MuiOutlinedInput-root': { borderRadius: '4px' },
          '& .MuiButton-root': { borderRadius: '4px' },
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <Box
              component="img"
              src="/duncit-logo.svg"
              alt="Duncit"
              sx={{
                height: 64,
                width: 'auto',
                objectFit: 'contain',
                animation: `${logoIn} 0.9s cubic-bezier(.2,.7,.2,1.4) both`,
              }}
            />
            <Typography variant="h5" fontWeight={800}>
              Welcome back
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Sign in to discover pods, hosts and venues near you.
            </Typography>
          </Stack>

          <LoginForm
            loading={loading}
            errorMessage={error?.message ?? null}
            onSubmit={handleSubmit}
          />

          <Divider sx={{ my: 2.5 }}>or</Divider>

          <Stack spacing={1.5} alignItems="center">
            <GoogleSignInButton
              onCredential={handleGoogle}
              loading={gLoading}
              text="signin_with"
            />
            {gError && (
              <Alert severity="error" sx={{ width: '100%' }}>
                {gError}
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary">
              New here?{' '}
              <Link component={RouterLink} to="/register" underline="hover">
                Create an account
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
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
