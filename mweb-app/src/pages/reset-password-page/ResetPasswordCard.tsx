import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Link, Stack, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AuthLogo from '../../components/AuthLogo';
import AuthScreenFrame from '../../components/AuthScreenFrame';
import { ResetPasswordForm, type ResetPasswordValues } from '../../forms/reset-password';

interface Props {
  email: string;
  loading: boolean;
  errorMessage: string | null;
  done: boolean;
  resending: boolean;
  onSubmit: (values: ResetPasswordValues) => Promise<void>;
  onResend: () => void;
}

export default function ResetPasswordCard({
  email,
  loading,
  errorMessage,
  done,
  resending,
  onSubmit,
  onResend,
}: Props) {
  if (done) {
    return (
      <AuthScreenFrame center>
        <Stack spacing={2.2} alignItems="center" data-testid="reset-success">
          <CheckCircleRoundedIcon sx={{ fontSize: 72, color: '#2e7d32' }} />
          <Typography variant="h4" fontWeight={900} textAlign="center" color="text.primary">
            Password reset <Box component="span" sx={{ color: '#2e7d32' }}>successfully</Box>
          </Typography>
          <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ maxWidth: 320 }}>
            Your password has been updated. You can now log in with your new password.
          </Typography>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            size="large"
            sx={{ borderRadius: 2, py: 1.1, px: 4, fontWeight: 700, textTransform: 'none' }}
          >
            Go to login
          </Button>
        </Stack>
      </AuthScreenFrame>
    );
  }

  return (
    <AuthScreenFrame center>
      <Stack spacing={2.1}>
        <Stack alignItems="center" spacing={1.2}>
          <AuthLogo />
          <Typography variant="h4" fontWeight={900} textAlign="center" color="text.primary">
            Reset <Box component="span" sx={{ color: '#ff5b72' }}>password</Box>
          </Typography>
          <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ maxWidth: 320 }}>
            Enter the OTP sent to {email || 'your email'} and choose a new password.
          </Typography>
        </Stack>

        <ResetPasswordForm loading={loading} errorMessage={errorMessage} onSubmit={onSubmit} />

        <Stack spacing={0.5} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Didn’t get it?{' '}
            <Link component="button" type="button" onClick={onResend} disabled={resending} underline="hover">
              {resending ? 'Resending…' : 'Resend OTP'}
            </Link>
          </Typography>
          <Link component={RouterLink} to="/login" underline="hover" variant="body2">
            Back to login
          </Link>
        </Stack>
      </Stack>
    </AuthScreenFrame>
  );
}
