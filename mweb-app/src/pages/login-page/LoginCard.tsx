import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Divider,
  Link,
  Stack,
  Typography,
  keyframes,
} from '@mui/material';
import LegalLinks from '../../components/LegalLinks';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import LoginForm, { type LoginFormValues } from '../../forms/login.form';

const fadeUp = keyframes`
  0%   { opacity: 0; transform: translateY(18px); }
  100% { opacity: 1; transform: translateY(0); }
`;
const logoIn = keyframes`
  0%   { opacity: 0; transform: scale(0.7); }
  60%  { opacity: 1; transform: scale(1.06); }
  100% { transform: scale(1); }
`;

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
    <Card
      elevation={6}
      sx={(theme) => ({
        width: '100%',
        maxWidth: 420,
        borderRadius: '4px',
        backdropFilter: 'blur(8px)',
        bgcolor:
          theme.palette.mode === 'dark'
            ? 'rgba(17, 26, 46, 0.92)'
            : 'rgba(255,255,255,0.92)',
        color: 'text.primary',
        animation: `${fadeUp} 0.7s cubic-bezier(.2,.7,.2,1.2) both`,
        '& .MuiOutlinedInput-root': { borderRadius: '4px' },
        '& .MuiButton-root': { borderRadius: '4px' },
      })}
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

        <LoginForm loading={loading} errorMessage={errorMessage} onSubmit={onSubmit} />

        <Divider sx={{ my: 2.5 }}>or</Divider>

        <Stack spacing={1.5} alignItems="center">
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
              Create an account
            </Link>
          </Typography>
          <LegalLinks prefix="By signing in," />
        </Stack>
      </CardContent>
    </Card>
  );
}
