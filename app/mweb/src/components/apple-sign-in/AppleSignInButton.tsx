import { useState } from 'react';
import AppleIcon from '@mui/icons-material/Apple';
import { useTheme } from '@mui/material/styles';
import { DuncitButton } from '@duncit/buttons';
import type { SocialCredential } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { appleCredentialOf, isAppleCancel, useAppleJs, useAppleWebConfig } from './useAppleJs';

interface Props {
  /** The visible label — sign in on the login screen, sign up on signup. */
  label: string;
  /** The page's half of the wait: it is still spending the id_token. */
  loading?: boolean;
  onCredential: (credential: SocialCredential) => void;
  onError: (message: string) => void;
}

/**
 * Sign in with Apple — Apple's own black (or, on a dark theme, white) pill with
 * its logo, per Apple's button guidelines, beside Google's.
 *
 * Renders nothing until the Tech portal holds a Services ID and Return URL:
 * a button that can only fail is worse than none. Closing Apple's popup is a
 * cancel and says nothing; anything else is reported through `onError`.
 * Native twin: app/mobile-app/src/components/AppleAuthButton.
 */
export default function AppleSignInButton({ label, loading, onCredential, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { servicesId, redirectUri } = useAppleWebConfig();
  const auth = useAppleJs(servicesId, redirectUri);
  const [prompting, setPrompting] = useState(false);

  if (!servicesId || !redirectUri) return null;

  const busy = prompting || loading === true;
  const isDark = theme.palette.mode === 'dark';

  const signIn = () => {
    if (!auth || busy) return;
    setPrompting(true);
    // Called inside the click: Apple opens a popup, and one opened after an
    // async gap is blocked.
    auth
      .signIn()
      .then((response) => onCredential(appleCredentialOf(response)))
      .catch((error: unknown) => {
        if (!isAppleCancel(error)) onError(t('mweb.auth.appleFailed'));
      })
      .finally(() => setPrompting(false));
  };

  return (
    <DuncitButton
      type="button"
      variant="contained"
      size="large"
      disableElevation
      startIcon={<AppleIcon />}
      onClick={signIn}
      disabled={!auth}
      aria-busy={busy || undefined}
      data-testid="apple-auth-button"
      sx={{
        minHeight: 44,
        px: 3,
        borderRadius: '999px',
        bgcolor: isDark ? 'common.white' : 'common.black',
        color: isDark ? 'common.black' : 'common.white',
        '&:hover': { bgcolor: isDark ? 'grey.200' : 'grey.900' },
      }}
    >
      {busy ? t('mweb.auth.appleConnecting') : label}
    </DuncitButton>
  );
}
