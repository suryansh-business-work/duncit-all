import { Formik, Form } from 'formik';
import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LockIcon from '@mui/icons-material/Lock';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { loginSchema } from '../validators/auth';
import { useColorMode } from '../ColorModeContext';

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

const LOGIN_GOOGLE = gql`
  mutation AdminLoginWithGoogle($input: GoogleAuthInput!) {
    loginWithGoogle(input: $input) {
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

const BrandMark = styled(Box)(({ theme }) => ({
  width: 48,
  height: 48,
  borderRadius: 12,
  display: 'grid',
  placeItems: 'center',
  margin: '0 auto',
  color: theme.palette.primary.contrastText,
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
}));

export default function LoginPage() {
  const [loginMutation, { loading, error }] = useMutation(LOGIN);
  const [loginGoogle, { loading: gLoading }] = useMutation(LOGIN_GOOGLE);
  const [gError, setGError] = useState<string | null>(null);
  const [seedSuperAdmin, { loading: seeding, data: seedData, error: seedError }] =
    useMutation(SEED_SUPER_ADMIN);
  const navigate = useNavigate();
  const { mode, toggle } = useColorMode();

  const handleGoogleCredential = async (idToken: string) => {
    setGError(null);
    try {
      const res = await loginGoogle({ variables: { input: { id_token: idToken } } });
      const data = res.data?.loginWithGoogle;
      const roles: string[] = data?.user?.roles ?? [];
      if (!roles.some((r) => ADMIN_ROLES.includes(r))) {
        setGError('This Google account does not have admin access.');
        return;
      }
      localStorage.setItem('admin_token', data.token);
      navigate('/hub');
    } catch (e: any) {
      setGError(e.message);
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
          <Stack spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
            <BrandMark>
              <LockIcon />
            </BrandMark>
            <Typography variant="h5">Admin Sign in</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Use your administrator credentials to access the Duncit console.
            </Typography>
          </Stack>

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={loginSchema}
            onSubmit={async (values, { setStatus }) => {
              setStatus(undefined);
              try {
                const res = await loginMutation({ variables: { input: values } });
                const data = res.data?.login;
                const roles: string[] = data?.user?.roles ?? [];
                if (!roles.some((r) => ADMIN_ROLES.includes(r))) {
                  setStatus('You do not have admin access.');
                  return;
                }
                localStorage.setItem('admin_token', data.token);
                navigate('/hub');
              } catch (e: any) {
                setStatus(e.message);
              }
            }}
          >
            {({ values, errors, touched, status, handleChange, handleBlur }) => (
              <Form noValidate>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    name="email"
                    type="email"
                    label="Email"
                    autoComplete="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email && !!errors.email}
                    helperText={touched.email && errors.email}
                  />
                  <TextField
                    fullWidth
                    name="password"
                    type="password"
                    label="Password"
                    autoComplete="current-password"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password && !!errors.password}
                    helperText={touched.password && errors.password}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                  >
                    {loading ? 'Signing in…' : 'Sign in'}
                  </Button>
                  {status && <Alert severity="error">{status}</Alert>}
                  {error && <Alert severity="error">{error.message}</Alert>}
                </Stack>
              </Form>
            )}
          </Formik>

          <Divider sx={{ my: 3 }}>or</Divider>

          <Stack spacing={1.5}>
            <GoogleSignInButton
              onCredential={handleGoogleCredential}
              loading={gLoading}
              text="signin_with"
            />
            {gError && <Alert severity="error">{gError}</Alert>}
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              disabled={seeding}
              onClick={() => seedSuperAdmin()}
            >
              {seeding ? 'Sending…' : 'Email Super Admin Credentials'}
            </Button>
            {seedData?.seedSuperAdmin && (
              <Alert severity={seedData.seedSuperAdmin.emailed ? 'success' : 'warning'}>
                {seedData.seedSuperAdmin.created
                  ? 'Super admin created. '
                  : 'Super admin already exists. '}
                {seedData.seedSuperAdmin.emailed
                  ? `Credentials emailed to ${seedData.seedSuperAdmin.email}.`
                  : 'Email could not be sent — check server SMTP config.'}
              </Alert>
            )}
            {seedError && <Alert severity="error">{seedError.message}</Alert>}
          </Stack>
        </CardContent>
      </Card>
    </Page>
  );
}
