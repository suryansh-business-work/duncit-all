import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Link, Stack, Typography } from '@mui/material';
import { auth } from '@duncit/auth-tokens';
import AuthLogo from '../../components/AuthLogo';
import AuthScreenFrame from '../../components/AuthScreenFrame';
import { ForgotPasswordForm, type ForgotPasswordValues } from '../../forms/forgot-password';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  loading: boolean;
  errorMessage: string | null;
  /** True when the entered email is not a registered account — swaps the footer
   * to a Create-Account CTA and flags the email field. */
  unregistered: boolean;
  onSubmit: (values: ForgotPasswordValues) => Promise<void>;
}

export default function ForgotPasswordCard({ loading, errorMessage, unregistered, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <AuthScreenFrame center>
      <Stack spacing={2.1}>
        <Stack spacing={1.2} sx={{
          alignItems: "center"
        }}>
          <AuthLogo />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              textAlign: "center",
              color: "text.primary"
            }}>
            {t('mweb.forgotPassword.title')}{' '}
            <Box component="span" sx={{ color: auth.accent }}>
              {t('mweb.forgotPassword.titleAccent')}
            </Box>
          </Typography>
          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              color: "text.secondary",
              maxWidth: 320
            }}>
            {t('mweb.forgotPassword.subtitle')}
          </Typography>
        </Stack>

        <ForgotPasswordForm
          loading={loading}
          errorMessage={errorMessage}
          emailError={unregistered ? t('mweb.forgotPassword.unregistered') : null}
          onSubmit={onSubmit}
        />

        {unregistered ? (
          <Stack spacing={1} sx={{
            alignItems: "center"
          }}>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {t('mweb.forgotPassword.newToDuncit')}
            </Typography>
            <Button
              component={RouterLink}
              to="/register"
              variant="contained"
              sx={{ borderRadius: '16px', px: 3, fontWeight: 700, textTransform: 'none' }}
            >
              {t('mweb.forgotPassword.createAccount')}
            </Button>
          </Stack>
        ) : (
          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              color: "text.secondary"
            }}>
            {t('mweb.forgotPassword.remembered')}{' '}
            <Link component={RouterLink} to="/login" underline="hover">
              {t('mweb.auth.backToLogin')}
            </Link>
          </Typography>
        )}
      </Stack>
    </AuthScreenFrame>
  );
}
