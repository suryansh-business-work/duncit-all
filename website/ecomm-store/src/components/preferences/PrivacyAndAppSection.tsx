import { Typography } from '@mui/material';
import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import InstallMobileRoundedIcon from '@mui/icons-material/InstallMobileRounded';
import { DuncitButton } from '@duncit/buttons';

import { logFailure } from '../../lib/log';
import { promptInstall, useInstallState } from '../../lib/pwa';
import { useStoreT } from '../../i18n';
import { PrefSection } from './PrefSection';

/**
 * Reopens the shared tracking-consent banner: it listens for clicks on any
 * `[data-consent-open]` element (@duncit/brand/consent-banner).
 */
export function CookiePreferencesButton({ onClick, fullWidth = false }: Readonly<{ onClick?: () => void; fullWidth?: boolean }>) {
  const { t } = useStoreT();
  return (
    <DuncitButton
      variant="outlined"
      color="inherit"
      fullWidth={fullWidth}
      startIcon={<CookieOutlinedIcon />}
      data-consent-open=""
      aria-haspopup="dialog"
      onClick={onClick}
      data-testid="cookie-preferences"
    >
      {t('ecommStore.prefs.cookies')}
    </DuncitButton>
  );
}

/** "Install the app" when the browser offers it; the Share-menu hint on iOS; nothing once installed. */
function InstallApp() {
  const { t } = useStoreT();
  const { canPrompt, iosHint } = useInstallState();
  if (canPrompt) {
    return (
      <>
        <Typography variant="body2" color="text.secondary">
          {t('ecommStore.prefs.installHint')}
        </Typography>
        <DuncitButton
          variant="contained"
          fullWidth
          startIcon={<InstallMobileRoundedIcon />}
          onClick={() => {
            promptInstall().catch(logFailure('preferences', 'install'));
          }}
          data-testid="prefs-install"
        >
          {t('ecommStore.prefs.install')}
        </DuncitButton>
      </>
    );
  }
  if (iosHint) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('ecommStore.prefs.iosHint')}
      </Typography>
    );
  }
  return null;
}

/** Cookie choices, and installing the store as an app when the browser can. */
export function PrivacyAndAppSection({ onCookies }: Readonly<{ onCookies: () => void }>) {
  const { t } = useStoreT();
  const { canPrompt, iosHint } = useInstallState();
  return (
    <>
      <PrefSection title={t('ecommStore.prefs.privacy')}>{() => <CookiePreferencesButton fullWidth onClick={onCookies} />}</PrefSection>
      {canPrompt || iosHint ? <PrefSection title={t('ecommStore.prefs.app')}>{() => <InstallApp />}</PrefSection> : null}
    </>
  );
}
