import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Alert, Divider, Link, Stack, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PinOutlinedIcon from '@mui/icons-material/PinOutlined';
import { auth } from '@duncit/auth-tokens';
import { BUTTON_SIZES, DuncitButton } from '@duncit/buttons';
import type { SocialCredential } from '@duncit/utils';
import LegalLinks from '../../components/LegalLinks';
import SocialRoundButtons from '../../components/SocialRoundButtons';
import { useAuthFit } from '../../hooks/useAuthFit';
import { useTranslation } from '../../i18n/useTranslation';
import { useWithRedirect } from '../../utils/redirect';
import LoginFeatureChips from './LoginFeatureChips';

interface Props {
  /** True while a Google or Apple credential is being spent. */
  socialLoading: boolean;
  socialError: string | null;
  onSocialCredential: (credential: SocialCredential) => void;
  onSocialError: (message: string) => void;
  onChoosePassword: () => void;
  onChooseOtp: () => void;
}

interface MethodRowProps {
  testId: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

/**
 * One "continue with…" door: a large surface pill — icon, label, chevron —
 * because it opens a step rather than signing anyone in. Hoisted (S6478).
 * Native twin: MethodButton in screens/LoginScreen/LoginMethodStep.tsx.
 */
function MethodRow({ testId, icon, label, onClick }: Readonly<MethodRowProps>) {
  return (
    <DuncitButton
      type="button"
      variant="outlined"
      color="inherit"
      size="large"
      fullWidth
      startIcon={icon}
      endIcon={<ChevronRightRoundedIcon />}
      onClick={onClick}
      data-testid={testId}
      sx={{
        minHeight: BUTTON_SIZES.lg.height,
        justifyContent: 'flex-start',
        bgcolor: 'background.paper',
        borderColor: 'divider',
        color: 'text.primary',
        '& .MuiButton-endIcon': { ml: 'auto', color: 'text.secondary' },
      }}
    >
      {label}
    </DuncitButton>
  );
}

/**
 * The landing step: how would you like to sign in?
 *
 * Feature chips, then the two doors that open a step (password, OTP), the way
 * to signup and the legal line — and, under an OR, Google and Apple as round
 * buttons. "Forgot password?" lives one step in, beside the password box: it
 * is only ever about a password.
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
  const authLink = useWithRedirect();
  // The gaps between blocks shrink with the viewport; the doors themselves don't.
  const { size } = useAuthFit();

  return (
    <Stack spacing={`${size(auth.fit.gap * (2 / 3))}px`}>
      <LoginFeatureChips />

      <Stack spacing={1.5}>
        <MethodRow
          testId="continue-with-password"
          icon={<LockOutlinedIcon />}
          label={t('mweb.login.continueWithPassword')}
          onClick={onChoosePassword}
        />
        <MethodRow
          testId="continue-with-otp"
          icon={<PinOutlinedIcon />}
          label={t('mweb.login.continueWithOtp')}
          onClick={onChooseOtp}
        />
      </Stack>

      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.login.newHere')}{' '}
          <Link component={RouterLink} to={authLink('/register')} underline="always" data-testid="go-signup">
            {t('mweb.login.createOne')}
          </Link>
        </Typography>
        <LegalLinks prefix={t('mweb.auth.legalSignIn')} />
      </Stack>

      <Divider>{t('mweb.auth.or')}</Divider>

      <SocialRoundButtons
        intent="SIGN_IN"
        loading={socialLoading}
        onCredential={onSocialCredential}
        onError={onSocialError}
      />
      {socialError && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {socialError}
        </Alert>
      )}

      <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
        {t('mweb.auth.appVersion', { vars: { version: __APP_VERSION__ } })}
      </Typography>
    </Stack>
  );
}
