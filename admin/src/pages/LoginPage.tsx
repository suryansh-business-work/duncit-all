import { gql, useMutation } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Divider, Stack, Typography } from '@mui/material';
import LoginForm, { type LoginFormValues } from '../forms/login.form';
import {
  getSafeRedirectPath,
  redirectPathFromLocation,
  type RedirectLocation,
} from '../utils/redirect';
import AuthSplitLayout from '../components/AuthSplitLayout';

const ADMIN_LOGIN_IMAGE =
  (import.meta.env.VITE_LOGIN_IMAGE as string | undefined) ||
  'https://images.pexels.com/photos/36713016/pexels-photo-36713016.jpeg';

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

export default function LoginPage() {
  const [loginMutation, { loading }] = useMutation(LOGIN);
  const [seedSuperAdmin, { loading: seeding, data: seedData, error: seedError }] =
    useMutation(SEED_SUPER_ADMIN);
  const navigate = useNavigate();
  const location = useLocation();

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
    <AuthSplitLayout
      title="Admin Sign in"
      subtitle="Use your administrator credentials to access the Duncit console."
      portalLabel="Admin Portal"
      fullName="Duncit Admin"
      tagline="Operate the Duncit platform — users, content, finance and policy from one place."
      loginImage={ADMIN_LOGIN_IMAGE}
    >
      <LoginForm loading={loading} onSubmit={handleLogin} />

      <Divider sx={{ my: 3 }}>or</Divider>

      <Stack spacing={1.5}>
        <Button variant="outlined" onClick={() => seedSuperAdmin()} disabled={seeding}>
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
        <Box />
      </Stack>
    </AuthSplitLayout>
  );
}
