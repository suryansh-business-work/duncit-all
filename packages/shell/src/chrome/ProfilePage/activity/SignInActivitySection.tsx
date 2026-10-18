import { Stack, Typography } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '../../../i18n/useTranslation';
import type { Translate } from '../../../i18n/fallback';
import { ProfileSection } from '../ProfileSection';
import type { ConnectedAccounts } from '../queries';

/** How a sign-in was made, in words. Each key is written out — never composed. */
function providerLabel(t: Translate, provider: string | null): string {
  switch (provider) {
    case 'EMAIL':
      return t('shell.profile.security.viaPassword');
    case 'OTP':
      return t('shell.profile.security.viaCode');
    case 'GOOGLE':
      return t('shell.profile.security.viaGoogle');
    case 'APPLE':
      return t('shell.profile.security.viaApple');
    default:
      return '';
  }
}

/**
 * The last sign-in and the Gmail that also opens this account.
 *
 * Google is read-only here on purpose: the consoles sign in with a password or
 * an emailed code, never with Google, so linking is done from mWeb or the app.
 */
export function SignInActivitySection({ accounts }: Readonly<{ accounts: ConnectedAccounts }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const via = providerLabel(t, accounts.last_login_provider);

  return (
    <ProfileSection testId="profile-sign-in-activity" title={t('shell.profile.security.activityTitle')}>
      <Stack spacing={1}>
        <Typography variant="body2" data-testid="profile-last-sign-in">
          {accounts.last_login_at
            ? t('shell.profile.security.lastSignIn', { vars: { when: formatDateTime(accounts.last_login_at) } })
            : t('shell.profile.security.noSignIn')}
          {accounts.last_login_at && via ? ` · ${via}` : ''}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <GoogleIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" noWrap data-testid="profile-google-link">
            {accounts.google
              ? t('shell.profile.security.googleLinked', { vars: { email: accounts.google.google_email } })
              : t('shell.profile.security.googleNotLinked')}
          </Typography>
        </Stack>
      </Stack>
    </ProfileSection>
  );
}
