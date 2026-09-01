import { Link as RouterLink } from 'react-router';
import { Alert, Box, Divider, Link, Stack, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PinOutlinedIcon from '@mui/icons-material/PinOutlined';
import { DuncitButton } from '@duncit/buttons';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import LegalLinks from '../../components/LegalLinks';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  gLoading: boolean;
  gError: string | null;
  onGoogleCredential: (idToken: string) => Promise<void> | void;
  onChoosePassword: () => void;
  onChooseOtp: () => void;
}

/**
 * The landing step: how would you like to sign in?
 *
 * Signing in is a choice of method now rather than a password form with a
 * Google button under it, so the two are offered side by side and the email and
 * password boxes live one step in. That is also where "Forgot password?"
 * belongs — it is only ever about the password, and on this screen it was
 * offering to recover something half the visitors never use.
 */
export default function LoginMethodStep({
  gLoading,
  gError,
  onGoogleCredential,
  onChoosePassword,
  onChooseOtp,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1.6}>
      <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
        {t('mweb.login.chooseMethod')}
      </Typography>

      <Stack spacing={1.4} sx={{ alignItems: 'center' }}>
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
      </Stack>

      <Divider>{t('mweb.auth.or')}</Divider>

      <DuncitButton
        type="button"
        variant="contained"
        size="large"
        startIcon={<LockOutlinedIcon />}
        onClick={onChoosePassword}
        data-testid="continue-with-password"
        sx={{
          borderRadius: '16px',
          py: 1.25,
          fontWeight: 700,
          textTransform: 'none',
          boxShadow: '0 8px 20px rgba(255,77,79,0.3)',
          transition: 'transform 0.18s ease',
          '&:hover': { transform: 'translateY(-1px)' },
        }}
      >
        {t('mweb.login.continueWithPassword')}
      </DuncitButton>

      <DuncitButton
        type="button"
        variant="outlined"
        size="large"
        startIcon={<PinOutlinedIcon />}
        onClick={onChooseOtp}
        data-testid="continue-with-otp"
        sx={{ borderRadius: '16px', py: 1.25, fontWeight: 700, textTransform: 'none' }}
      >
        {t('mweb.login.continueWithOtp')}
      </DuncitButton>

      <Stack spacing={1.4} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.login.newHere')}{' '}
          <Link component={RouterLink} to="/register" underline="hover">
            {t('mweb.login.createOne')}
          </Link>
        </Typography>
        <LegalLinks prefix={t('mweb.auth.legalSignIn')} />
        <Box component="span">
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {t('mweb.auth.appVersion', { vars: { version: __APP_VERSION__ } })}
          </Typography>
        </Box>
      </Stack>
    </Stack>
  );
}
