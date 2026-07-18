import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Link, Stack, Typography } from '@mui/material';
import AuthLogo from '../../components/AuthLogo';
import AuthScreenFrame from '../../components/AuthScreenFrame';
import { ForgotPasswordForm, type ForgotPasswordValues } from '../../forms/forgot-password';

interface Props {
  loading: boolean;
  errorMessage: string | null;
  /** True when the entered email is not a registered account — swaps the footer
   * to a Create-Account CTA and flags the email field. */
  unregistered: boolean;
  onSubmit: (values: ForgotPasswordValues) => Promise<void>;
}

export default function ForgotPasswordCard({ loading, errorMessage, unregistered, onSubmit }: Readonly<Props>) {
  return (
    <AuthScreenFrame center>
      <Stack spacing={2.1}>
        <Stack alignItems="center" spacing={1.2}>
          <AuthLogo />
          <Typography variant="h4" fontWeight={900} textAlign="center" color="text.primary">
            Forgot <Box component="span" sx={{ color: '#ff5b72' }}>password?</Box>
          </Typography>
          <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ maxWidth: 320 }}>
            Enter your email and we’ll send you a 6-digit OTP to reset your password.
          </Typography>
        </Stack>

        <ForgotPasswordForm
          loading={loading}
          errorMessage={errorMessage}
          emailError={unregistered ? 'Unregistered User' : null}
          onSubmit={onSubmit}
        />

        {unregistered ? (
          <Stack alignItems="center" spacing={1}>
            <Typography variant="body2" color="text.secondary">
              New to Duncit?
            </Typography>
            <Button
              component={RouterLink}
              to="/register"
              variant="contained"
              sx={{ borderRadius: 2, px: 3, fontWeight: 700, textTransform: 'none' }}
            >
              Create Account
            </Button>
          </Stack>
        ) : (
          <Typography variant="body2" textAlign="center" color="text.secondary">
            Remembered it?{' '}
            <Link component={RouterLink} to="/login" underline="hover">
              Back to login
            </Link>
          </Typography>
        )}
      </Stack>
    </AuthScreenFrame>
  );
}
