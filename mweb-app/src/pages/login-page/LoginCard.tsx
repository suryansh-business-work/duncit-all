import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Divider,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import AuthLogo from '../../components/AuthLogo';
import AuthScreenFrame from '../../components/AuthScreenFrame';
import LegalLinks from '../../components/LegalLinks';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import { LoginForm, type LoginFormValues } from '../../forms/login';

interface Props {
  loading: boolean;
  errorMessage: string | null;
  onSubmit: (values: LoginFormValues) => Promise<void>;
  gLoading: boolean;
  gError: string | null;
  onGoogleCredential: (idToken: string) => Promise<void> | void;
}

export default function LoginCard({
  loading,
  errorMessage,
  onSubmit,
  gLoading,
  gError,
  onGoogleCredential,
}: Props) {
  return (
    <AuthScreenFrame center>
      <Stack spacing={2.1}>
        <Stack alignItems="center" spacing={1.2}>
          <AuthLogo />
          <Typography variant="h4" fontWeight={900} textAlign="center" color="text.primary">
            Welcome <Box component="span" sx={{ color: '#ff5b72' }}>back.</Box>
          </Typography>
          <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ maxWidth: 300 }}>
            Pick up where you left off and find pods around you.
          </Typography>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            px: 1.25,
            py: 1,
            borderRadius: 2,
            bgcolor: 'action.hover',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={-0.7}>
            {['#ff5b67', '#ff8d47', '#aa4cff'].map((color) => (
              <Box key={color} sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: color, border: '2px solid #201529' }} />
            ))}
          </Stack>
          <Typography variant="caption" fontWeight={800} color="text.primary">
            New pods are waiting for your crew today
          </Typography>
        </Stack>

        <LoginForm loading={loading} errorMessage={errorMessage} onSubmit={onSubmit} submitLabel="Log me in" />

        <Stack alignItems="flex-end" sx={{ mt: -1 }}>
          <Link component={RouterLink} to="/forgot-password" underline="hover" variant="body2">
            Forgot password?
          </Link>
        </Stack>

        <Divider>OR</Divider>

        <Stack spacing={1.4} alignItems="center">
          <GoogleSignInButton
            onCredential={onGoogleCredential}
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
              Create one
            </Link>
          </Typography>
          <LegalLinks prefix="By signing in," />
        </Stack>
      </Stack>
    </AuthScreenFrame>
  );
}
