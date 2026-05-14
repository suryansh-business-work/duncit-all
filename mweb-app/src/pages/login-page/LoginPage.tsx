import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconButton, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useColorMode } from '../../ColorModeContext';
import AuthBackground from '../../components/AuthBackground';
import GoogleAuthNoticeDialog from '../../components/GoogleAuthNoticeDialog';
import { type LoginFormValues } from '../../forms/login.form';
import { parseApiError } from '../../utils/parseApiError';
import {
  getSafeRedirectPath,
  redirectPathFromLocation,
  type RedirectLocation,
} from '../../utils/redirect';
import { LOGIN, LOGIN_GOOGLE } from './queries';
import LoginCard from './LoginCard';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
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
    const params = new URLSearchParams(location.search);
    const stateFrom = (location.state as { from?: RedirectLocation } | null)?.from;
    const redirect =
      getSafeRedirectPath(params.get('redirect')) ||
      getSafeRedirectPath(stateFrom ? redirectPathFromLocation(stateFrom) : '');
    navigate(user?.onboarding_survey_completed === false ? '/signup-survey' : redirect || '/', {
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
        setGError(parseApiError(e));
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

      <LoginCard
        loading={loading}
        errorMessage={error ? parseApiError(error) : null}
        onSubmit={handleSubmit}
        gLoading={gLoading}
        gError={gError}
        onGoogleCredential={handleGoogle}
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
