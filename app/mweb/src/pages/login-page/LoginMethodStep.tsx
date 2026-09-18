import { Link as RouterLink } from 'react-router';
import { Alert, Divider, Link, Stack, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PinOutlinedIcon from '@mui/icons-material/PinOutlined';
import { DuncitButton } from '@duncit/buttons';
import type { SocialCredential } from '@duncit/utils';
import { AppleSignInButton } from '../../components/apple-sign-in';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import LegalLinks from '../../components/LegalLinks';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** True while a Google or Apple credential is being spent. */
  socialLoading: boolean;
  socialError: string | null;
  onSocialCredential: (credential: SocialCredential) => void;
  onSocialError: (message: string) => void;
  onChoosePassword: () => void;
  onChooseOtp: () => void;
}

/**
 * The two "continue with…" choices: surface pills with a hairline, ink label
 * and icon — the same weight as the Google and Apple pills above them, because all four
 * are a choice of door, not the action itself. The green pill waits one step
 * in, on the button that actually signs you in. Native twin: MethodButton in
 * screens/LoginScreen/LoginMethodStep.tsx.
 */
const METHOD_SX = {
  bgcolor: 'background.paper',
  borderColor: 'divider',
  color: 'text.primary',
} as const;

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
  socialLoading,
  socialError,
  onSocialCredential,
  onSocialError,
  onChoosePassword,
  onChooseOtp,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={2}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <GoogleSignInButton
          onCredential={(idToken) => onSocialCredential({ provider: 'GOOGLE', idToken })}
          loading={socialLoading}
          text="signin_with"
        />
        <AppleSignInButton
          label={t('mweb.auth.appleSignIn')}
          loading={socialLoading}
          onCredential={onSocialCredential}
          onError={onSocialError}
        />
        {socialError && (
          <Alert severity="error" sx={{ width: '100%' }}>
            {socialError}
          </Alert>
        )}
      </Stack>

      <Divider>{t('mweb.auth.or')}</Divider>

      <DuncitButton
        type="button"
        variant="outlined"
        color="inherit"
        size="large"
        fullWidth
        startIcon={<LockOutlinedIcon />}
        onClick={onChoosePassword}
        data-testid="continue-with-password"
        sx={METHOD_SX}
      >
        {t('mweb.login.continueWithPassword')}
      </DuncitButton>

      <DuncitButton
        type="button"
        variant="outlined"
        color="inherit"
        size="large"
        fullWidth
        startIcon={<PinOutlinedIcon />}
        onClick={onChooseOtp}
        data-testid="continue-with-otp"
        sx={METHOD_SX}
      >
        {t('mweb.login.continueWithOtp')}
      </DuncitButton>

      <Stack spacing={1.5} sx={{ alignItems: 'center', pt: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.login.newHere')}{' '}
          <Link component={RouterLink} to="/register" underline="hover" data-testid="go-signup">
            {t('mweb.login.createOne')}
          </Link>
        </Typography>
        <LegalLinks prefix={t('mweb.auth.legalSignIn')} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('mweb.auth.appVersion', { vars: { version: __APP_VERSION__ } })}
        </Typography>
      </Stack>
    </Stack>
  );
}
