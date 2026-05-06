import { useState } from 'react';
import { Formik, Form } from 'formik';
import { gql, useMutation } from '@apollo/client';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
  keyframes,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { loginSchema } from '../validators/auth';
import GoogleSignInButton from '../components/GoogleSignInButton';

const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user { user_id first_name email roles }
    }
  }
`;
const LOGIN_GOOGLE = gql`
  mutation LoginWithGoogle($input: GoogleAuthInput!) {
    loginWithGoogle(input: $input) {
      token
      user { user_id first_name email roles }
    }
  }
`;

const gradientShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;
const fadeUp = keyframes`
  0%   { opacity: 0; transform: translateY(18px); }
  100% { opacity: 1; transform: translateY(0); }
`;
const float = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%      { transform: translateY(-12px) rotate(2deg); }
`;
const logoIn = keyframes`
  0%   { opacity: 0; transform: scale(0.7); }
  60%  { opacity: 1; transform: scale(1.06); }
  100% { transform: scale(1); }
`;

export default function LoginPage() {
  const navigate = useNavigate();
  const [loginMutation, { loading, error }] = useMutation(LOGIN);
  const [loginGoogle, { loading: gLoading }] = useMutation(LOGIN_GOOGLE);
  const [gError, setGError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

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
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        p: 2,
        overflow: 'hidden',
        background:
          'linear-gradient(120deg, #ffe1e2 0%, #fff 30%, #ffd6d8 65%, #fff0c4 100%)',
        backgroundSize: '300% 300%',
        animation: `${gradientShift} 18s ease infinite`,
      }}
    >
      {/* Floating decorative blobs */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: '-80px',
          left: '-60px',
          width: 220,
          height: 220,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 30% 30%, rgba(255,77,79,0.25), transparent 70%)',
          animation: `${float} 7s ease-in-out infinite`,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: '-90px',
          right: '-50px',
          width: 280,
          height: 280,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 60% 40%, rgba(255,200,80,0.28), transparent 70%)',
          animation: `${float} 9s ease-in-out infinite reverse`,
        }}
      />

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

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={loginSchema}
            onSubmit={async (values, { setStatus }) => {
              setStatus(undefined);
              try {
                const res = await loginMutation({ variables: { input: values } });
                const token = res.data?.login?.token;
                if (token) {
                  localStorage.setItem('token', token);
                  navigate('/');
                }
              } catch (e: any) {
                setStatus(e.message);
              }
            }}
          >
            {({ values, errors, touched, status, handleChange, handleBlur }) => (
              <Form noValidate>
                <Stack
                  spacing={2}
                  sx={{
                    '& > *': {
                      animation: `${fadeUp} 0.6s ease-out both`,
                    },
                    '& > *:nth-of-type(1)': { animationDelay: '0.1s' },
                    '& > *:nth-of-type(2)': { animationDelay: '0.2s' },
                    '& > *:nth-of-type(3)': { animationDelay: '0.3s' },
                  }}
                >
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
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlinedIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    name="password"
                    type={showPwd ? 'text' : 'password'}
                    label="Password"
                    autoComplete="current-password"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password && !!errors.password}
                    helperText={touched.password && errors.password}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowPwd((v) => !v)}
                            edge="end"
                            aria-label="toggle password"
                          >
                            {showPwd ? (
                              <VisibilityOffOutlinedIcon fontSize="small" />
                            ) : (
                              <VisibilityOutlinedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{
                      borderRadius: 2,
                      py: 1.25,
                      fontWeight: 700,
                      textTransform: 'none',
                      boxShadow: '0 8px 20px rgba(255,77,79,0.3)',
                      transition: 'transform 0.18s ease',
                      '&:hover': { transform: 'translateY(-1px)' },
                    }}
                  >
                    {loading ? 'Signing in…' : 'Login'}
                  </Button>
                  {(status || error) && (
                    <Alert severity="error">{status || error?.message}</Alert>
                  )}
                </Stack>
              </Form>
            )}
          </Formik>

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
    </Box>
  );
}
