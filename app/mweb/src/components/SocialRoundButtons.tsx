import { Stack, Typography } from '@mui/material';
import type { SocialCredential } from '@duncit/utils';
import GoogleSignInButton from './GoogleSignInButton';
import { AppleSignInButton, useAppleWebConfig } from './apple-sign-in';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  /** Which door: the Apple button's accessible name and Google's prompt follow it. */
  intent: 'SIGN_IN' | 'SIGN_UP';
  /** True while a credential is being spent — both buttons wait. */
  loading: boolean;
  onCredential: (credential: SocialCredential) => void;
  onError: (message: string) => void;
}

/**
 * Google and Apple as a row of round buttons, each captioned with the
 * provider's name — the redesigned login and signup screens share it so the
 * two doors cannot drift apart. Apple renders nothing until the Tech portal is
 * configured, so the row is just Google then. Native twin:
 * app/mobile-app/src/components/SocialRoundButtons.
 */
export default function SocialRoundButtons({ intent, loading, onCredential, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack
      data-testid="social-round-buttons"
      direction="row"
      spacing={6}
      sx={{ justifyContent: 'center', alignItems: 'flex-start' }}
    >
      <Stack spacing={1} sx={{ alignItems: 'center' }}>
        <GoogleSignInButton
          variant="icon"
          text={intent === 'SIGN_UP' ? 'signup_with' : 'signin_with'}
          loading={loading}
          onCredential={(idToken) => onCredential({ provider: 'GOOGLE', idToken })}
        />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.auth.googleShort')}
        </Typography>
      </Stack>
      <AppleCell intent={intent} loading={loading} onCredential={onCredential} onError={onError} />
    </Stack>
  );
}

/** Apple with its caption — hoisted (S6478). Nothing at all until Tech has configured Apple. */
function AppleCell({ intent, loading, onCredential, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const { servicesId, redirectUri } = useAppleWebConfig();
  if (!servicesId || !redirectUri) return null;
  return (
    <Stack spacing={1} sx={{ alignItems: 'center' }}>
      <AppleSignInButton
        variant="icon"
        label={intent === 'SIGN_UP' ? t('mweb.auth.appleSignUp') : t('mweb.auth.appleSignIn')}
        loading={loading}
        onCredential={onCredential}
        onError={onError}
      />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('mweb.auth.appleShort')}
      </Typography>
    </Stack>
  );
}
