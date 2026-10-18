import { useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack } from '@mui/material';
import { useTranslation } from '../../../i18n/useTranslation';
import {
  MY_CONNECTED_ACCOUNTS,
  MY_LOGIN_ACTIVITY,
  type ConnectedAccounts,
  type LoginActivityHistory,
} from '../queries';
import { LoginHistorySection } from './LoginHistorySection';
import { SignInActivitySection } from './SignInActivitySection';

/**
 * The last sign-in, and every sign-in before it within the retention window —
 * when, how, roughly where and on what. Reuses the Security tab's
 * MY_CONNECTED_ACCOUNTS, so switching between the two tabs reads the cache.
 */
export function LoginActivityTab() {
  const { t } = useTranslation();
  const accountsQuery = useQuery<{ myConnectedAccounts: ConnectedAccounts }>(MY_CONNECTED_ACCOUNTS, {
    fetchPolicy: 'cache-and-network',
  });
  const historyQuery = useQuery<{ myLoginActivity: LoginActivityHistory }>(MY_LOGIN_ACTIVITY, {
    fetchPolicy: 'cache-and-network',
  });
  const accounts = accountsQuery.data?.myConnectedAccounts ?? null;
  const history = historyQuery.data?.myLoginActivity ?? null;

  if (!accounts || !history) {
    if (accountsQuery.loading || historyQuery.loading) return <Skeleton variant="rounded" height={240} />;
    return (
      <Alert severity="error" data-testid="profile-activity-error">
        {t('shell.profile.activity.loadFailed')}
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <SignInActivitySection accounts={accounts} />
      <LoginHistorySection history={history} />
    </Stack>
  );
}
