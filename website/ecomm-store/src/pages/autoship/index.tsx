import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import { DuncitButton } from '@duncit/buttons';
import { Loader } from '@duncit/ui';

import { useStoreSession } from '../../app/providers/SessionProvider';
import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { EmptyState } from '../../components/EmptyState';
import { MY_SUBSCRIPTIONS } from '../../graphql/autoship';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { AccountLayout } from '../account/AccountLayout';
import { NotFoundContent } from '../info/NotFoundPage';
import { SubscriptionCard } from './SubscriptionCard';

function SubscriptionList() {
  const { t } = useStoreT();
  const { data, loading } = useQuery(MY_SUBSCRIPTIONS, { fetchPolicy: 'cache-and-network' });
  const subscriptions = data?.storeMySubscriptions ?? [];
  if (loading && subscriptions.length === 0) return <Loader label={t('ecommStore.common.loading')} />;
  if (subscriptions.length === 0) {
    return (
      <EmptyState
        icon={<SyncRoundedIcon />}
        title={t('ecommStore.autoship.emptyTitle')}
        body={t('ecommStore.autoship.emptyBody')}
        action={
          <DuncitButton component={RouterLink} to={paths.shop} variant="contained">
            {t('ecommStore.cart.startShopping')}
          </DuncitButton>
        }
      />
    );
  }
  return (
    <Stack component="ul" spacing={1.5} sx={{ p: 0, m: 0 }}>
      {subscriptions.map((subscription, position) => (
        <SubscriptionCard key={subscription.id} subscription={subscription} position={position} />
      ))}
    </Stack>
  );
}

/** /autoship — "Subscriptions: manage your autoship deliveries". */
export function AutoshipPage() {
  const { t } = useStoreT();
  const { autoship_enabled: enabled } = useStoreSettings();
  const { signedIn } = useStoreSession();
  if (!enabled) return <NotFoundContent />;
  return (
    <AccountLayout title={t('ecommStore.autoship.title')}>
      <Stack spacing={2}>
        <Typography color="text.secondary">{t('ecommStore.autoship.subtitle')}</Typography>
        {signedIn ? <SubscriptionList /> : null}
      </Stack>
    </AccountLayout>
  );
}
