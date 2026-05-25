import { useMemo } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Card, CardContent, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useColorMode } from '../ColorModeContext';
import { appConfig } from '../config/app-config';
import { accessDeniedMessage, hasAppAccess, setToken } from '../lib/session';
import { parseApiError } from '../utils/parseApiError';
import { getSafeRedirectPath, redirectPathFromLocation, type RedirectLocation } from '../utils/redirect';
import { LoginForm, type LoginFormValues } from '../forms/login';

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

const Page = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: theme.spacing(3),
  background: `radial-gradient(1100px 520px at 8% -10%, ${theme.palette.primary.main}24, transparent 60%),
               radial-gradient(900px 480px at 108% 105%, ${theme.palette.secondary.main}22, transparent 60%),
               ${theme.palette.background.default}`,
}));

const TopBar = styled(Box)(({ theme }) => ({ position: 'absolute', top: theme.spacing(2), right: theme.spacing(2) }));

export default function LoginPage() {
  const [loginMutation, { loading }] = useMutation(LOGIN);
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle } = useColorMode();

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
    <Page>
      <TopBar>
        <Tooltip title={mode === 'dark' ? 'Switch to light' : 'Switch to dark'}>
          <IconButton onClick={toggle} aria-label="toggle color mode">
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
      </TopBar>

      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={1.25} alignItems="center" sx={{ mb: 3 }}>
            <Box component="img" src="/duncit-logo.svg" alt="Duncit" sx={{ height: 60, width: 'auto', maxWidth: 220, objectFit: 'contain' }} />
            <Typography variant="h5">{appConfig.fullName}</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {appConfig.tagline} Sign in with your Duncit account.
            </Typography>
          </Stack>

          {deniedFromRedirect && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {accessDeniedMessage()}
            </Alert>
          )}

          <LoginForm loading={loading} onSubmit={handleLogin} submitLabel={`Open ${appConfig.name} console`} />
        </CardContent>
      </Card>
    </Page>
  );
}
