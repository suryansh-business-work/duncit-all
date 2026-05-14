import { gql, useMutation } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useColorMode } from '../ColorModeContext';
import LoginForm, { type LoginFormValues } from '../forms/login.form';
import {
  getSafeRedirectPath,
  redirectPathFromLocation,
  type RedirectLocation,
} from '../utils/redirect';

const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'CITY_ADMIN',
  'ZONAL_ADMIN',
  'SUPPORT_USER',
  'FINANCE_USER',
];

const LOGIN = gql`
  mutation AdminLogin($input: LoginInput!) {
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

const SEED_SUPER_ADMIN = gql`
  mutation SeedSuperAdmin {
    seedSuperAdmin {
      created
      emailed
      email
    }
  }
`;

const Page = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: theme.spacing(3),
  background: `radial-gradient(1200px 600px at 10% -10%, ${theme.palette.primary.main}22, transparent 60%),
               radial-gradient(900px 500px at 110% 110%, ${theme.palette.secondary.main}22, transparent 60%),
               ${theme.palette.background.default}`,
}));

const TopBar = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
}));

export default function LoginPage() {
  const [loginMutation, { loading }] = useMutation(LOGIN);
  const [seedSuperAdmin, { loading: seeding, data: seedData, error: seedError }] =
    useMutation(SEED_SUPER_ADMIN);
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle } = useColorMode();

  const redirectAfterLogin = () => {
    const params = new URLSearchParams(location.search);
    const stateFrom = (location.state as { from?: RedirectLocation } | null)?.from;
    return (
      getSafeRedirectPath(params.get('redirect')) ||
      getSafeRedirectPath(stateFrom ? redirectPathFromLocation(stateFrom) : '') ||
      '/hub'
    );
  };

  const handleLogin = async (values: LoginFormValues) => {
    const res = await loginMutation({ variables: { input: values } });
    const data = res.data?.login;
    const roles: string[] = data?.user?.roles ?? [];
    if (!roles.some((r) => ADMIN_ROLES.includes(r))) {
      throw new Error('You do not have admin access.');
    }
    localStorage.setItem('admin_token', data.token);
    navigate(redirectAfterLogin(), { replace: true });
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
          <Stack spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
            <Box
              component="img"
              src="/duncit-logo.svg"
              alt="Duncit"
              sx={{ height: 64, width: 'auto', maxWidth: 240, objectFit: 'contain' }}
            />
            <Typography variant="h5">Admin Sign in</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Use your administrator credentials to access the Duncit console.
            </Typography>
          </Stack>

          <LoginForm loading={loading} onSubmit={handleLogin} />

          <Divider sx={{ my: 3 }}>or</Divider>

          <Stack spacing={1.5}>
            <Button
              variant="outlined"
              onClick={() => seedSuperAdmin()}
              disabled={seeding}
            >
              {seeding ? 'Seeding…' : 'Seed Super Admin'}
            </Button>
            {seedError && <Alert severity="error">{seedError.message}</Alert>}
            {seedData?.seedSuperAdmin && (
              <Alert severity="success">
                {seedData.seedSuperAdmin.created
                  ? `Super admin created: ${seedData.seedSuperAdmin.email}`
                  : `Super admin already exists: ${seedData.seedSuperAdmin.email}`}
                {seedData.seedSuperAdmin.emailed
                  ? ' (credentials emailed)'
                  : ' (email not sent — check SMTP)'}
              </Alert>
            )}
            <Typography variant="caption" color="text.secondary" textAlign="center">
              First-time setup helper. Disable in production once seeded.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Page>
  );
}
