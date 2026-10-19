import { useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack } from '@mui/material';
import { createLogger } from '@duncit/logs';
import { useTranslation } from '../../../i18n/useTranslation';
import { MY_CONNECTED_ACCOUNTS, type ConnectedAccounts } from '../queries';
import { PasswordSection } from './PasswordSection';
import { SignOutEverywhereSection } from './SignOutEverywhereSection';
import { TwoFactorSection } from './two-factor/TwoFactorSection';

const logger = createLogger('portal');

/** Password, two-factor and every open session, on one tab. Sign-in history
 * has its own Login activity tab. */
export function SecurityTab({ onSignedOut }: Readonly<{ onSignedOut: () => void }>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ myConnectedAccounts: ConnectedAccounts }>(
    MY_CONNECTED_ACCOUNTS,
    { fetchPolicy: 'cache-and-network' },
  );
  const accounts = data?.myConnectedAccounts ?? null;

  if (!accounts) {
    if (loading) return <Skeleton variant="rounded" height={160} />;
    return (
      <Alert severity="error" data-testid="profile-security-error">
        {error ? t('shell.profile.security.loadFailed') : t('shell.profile.genericError')}
      </Alert>
    );
  }

  // The change already succeeded; a failed reload only leaves the old facts on screen.
  const reload = () => {
    refetch().catch((error) => logger.warn('profile', 'securityRefetch', { error }));
  };

  return (
    <Stack spacing={2}>
      <PasswordSection
        hasPassword={accounts.has_password}
        changedAt={accounts.password_changed_at}
        onChanged={reload}
      />
      <TwoFactorSection accounts={accounts} onChanged={reload} />
      <SignOutEverywhereSection onSignedOut={onSignedOut} />
    </Stack>
  );
}
