import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Link, Stack, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { auth } from '@duncit/auth-tokens';
import AuthLogo from '../../components/AuthLogo';
import AuthScreenFrame from '../../components/AuthScreenFrame';
import { ResetPasswordForm, type ResetPasswordValues } from '../../forms/reset-password';
import { useTranslation } from '../../i18n/useTranslation';

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
}: Readonly<Props>) {
  const { t } = useTranslation();

  if (done) {
    return (
      <AuthScreenFrame center>
        <Stack spacing={2.2} alignItems="center" data-testid="reset-success">
          <CheckCircleRoundedIcon sx={{ fontSize: 72, color: 'success.main' }} />
          <Typography variant="h4" fontWeight={700} textAlign="center" color="text.primary">
            {t('mweb.resetPassword.successTitle')}{' '}
            <Box component="span" sx={{ color: 'success.main' }}>
              {t('mweb.resetPassword.successTitleAccent')}
            </Box>
          </Typography>
          <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ maxWidth: 320 }}>
            {t('mweb.resetPassword.successSubtitle')}
          </Typography>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            size="large"
            sx={{ borderRadius: '16px', py: 1.1, px: 4, fontWeight: 700, textTransform: 'none' }}
          >
            {t('mweb.resetPassword.goToLogin')}
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
          <Typography variant="h4" fontWeight={700} textAlign="center" color="text.primary">
            {t('mweb.resetPassword.title')}{' '}
            <Box component="span" sx={{ color: auth.accent }}>
              {t('mweb.resetPassword.titleAccent')}
            </Box>
          </Typography>
          <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ maxWidth: 320 }}>
            {t('mweb.resetPassword.subtitle', {
              vars: { email: email || t('mweb.resetPassword.emailFallback') },
            })}
          </Typography>
        </Stack>

        <ResetPasswordForm loading={loading} errorMessage={errorMessage} onSubmit={onSubmit} />

        <Stack spacing={0.5} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {t('mweb.resetPassword.didntGetIt')}{' '}
            <Link component="button" type="button" onClick={onResend} disabled={resending} underline="hover">
              {resending ? t('mweb.resetPassword.resending') : t('mweb.resetPassword.resend')}
            </Link>
          </Typography>
          <Link component={RouterLink} to="/login" underline="hover" variant="body2">
            {t('mweb.auth.backToLogin')}
          </Link>
        </Stack>
      </Stack>
    </AuthScreenFrame>
  );
}
