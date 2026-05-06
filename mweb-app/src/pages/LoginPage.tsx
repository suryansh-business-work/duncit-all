import { useState } from 'react';
import { Formik, Form } from 'formik';
import { gql, useMutation } from '@apollo/client';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Divider,
  Link,
} from '@mui/material';
import { loginSchema } from '../validators/auth';
import AuthLogo from '../components/AuthLogo';
import GoogleSignInButton from '../components/GoogleSignInButton';

const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
      }
    }
  }
`;

const LOGIN_GOOGLE = gql`
  mutation LoginWithGoogle($input: GoogleAuthInput!) {
    loginWithGoogle(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
      }
    }
  }
`;

export default function LoginPage() {
  const [loginMutation, { loading, error }] = useMutation(LOGIN);
  const [loginGoogle, { loading: gLoading }] = useMutation(LOGIN_GOOGLE);
  const [gError, setGError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGoogle = async (idToken: string) => {
    setGError(null);
    try {
      const res = await loginGoogle({ variables: { input: { id_token: idToken } } });
      const token = res.data?.loginWithGoogle?.token;
      if (token) {
        localStorage.setItem('token', token);
        navigate('/');
      }
    } catch (e: any) {
      setGError(e.message);
    }
  };

  return (
    <Card elevation={2}>
      <CardContent>
        <AuthLogo tagline="Welcome back. Sign in to continue." />
        <Typography variant="h5" textAlign="center" gutterBottom>
          Sign in
        </Typography>
        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={loginSchema}
          onSubmit={async (values) => {
            const res = await loginMutation({ variables: { input: values } });
            const token = res.data?.login?.token;
            if (token) {
              localStorage.setItem('token', token);
              navigate('/');
            }
          }}
        >
          {({ values, errors, touched, handleChange, handleBlur }) => (
            <Form>
              <Stack spacing={2}>
                <TextField
                  fullWidth name="email" type="email" label="Email"
                  value={values.email} onChange={handleChange} onBlur={handleBlur}
                  error={touched.email && !!errors.email}
                  helperText={touched.email && errors.email}
                  InputLabelProps={{ shrink: true }}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <TextField
                  fullWidth name="password" type="password" label="Password"
                  value={values.password} onChange={handleChange} onBlur={handleBlur}
                  error={touched.password && !!errors.password}
                  helperText={touched.password && errors.password}
                  InputLabelProps={{ shrink: true }}
                  placeholder="Your password"
                  autoComplete="current-password"
                />
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? 'Signing in…' : 'Login'}
                </Button>
                {error && <Alert severity="error">{error.message}</Alert>}
              </Stack>
            </Form>
          )}
        </Formik>

        <Divider sx={{ my: 2.5 }}>or</Divider>

        <Stack spacing={1.5} alignItems="center">
          <GoogleSignInButton onCredential={handleGoogle} loading={gLoading} text="signin_with" />
          {gError && <Alert severity="error" sx={{ width: '100%' }}>{gError}</Alert>}
          <Typography variant="body2" color="text.secondary">
            New here?{' '}
            <Link component={RouterLink} to="/register" underline="hover">
              Create an account
            </Link>
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
