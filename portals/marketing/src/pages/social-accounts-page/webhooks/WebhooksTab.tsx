import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, Stack, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, clientTableFetch } from '@duncit/table';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { useUserData } from '@duncit/user-context';
import { deliveryColumns } from './deliveryColumns';
import DeliveryBodyDialog from './DeliveryBodyDialog';
import WebhookAppCard from './WebhookAppCard';
import { SOCIAL_WEBHOOK_DELIVERIES, SOCIAL_WEBHOOK_SETUP, type WebhookAppStatus, type WebhookDelivery } from './webhooks.queries';

/** The same roles the server lets read deliveries and register webhooks (social.webhook.resolver.ts). */
const WEBHOOK_MANAGERS = new Set(['SUPER_ADMIN', 'MARKETING_MANAGER']);
/** The most recent deliveries the server keeps a list of. */
const DELIVERY_LIMIT = 50;
const getRowId = (row: WebhookDelivery) => row.id;
/** Read again; a failure is said out loud, never dropped. */
const refetch = (run: () => Promise<unknown>) => {
  run().catch((err: unknown) => notify(parseApiError(err), 'error'));
};
const searchOf = (row: WebhookDelivery) => `${row.object} ${row.entry_ids.join(' ')} ${row.fields.join(' ')} ${row.status} ${row.error}`;

/**
 * Social Accounts › Webhooks: whether Meta will call us at all (each app's
 * registration, with the button that sets it), and every delivery that did
 * arrive with what became of it. A DM that never reaches the Inbox shows up
 * here as either no registration or a delivery that said why.
 */
export default function WebhooksTab() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { user } = useUserData();
  const canManage = (user?.roles ?? []).some((role) => WEBHOOK_MANAGERS.has(role));
  const setup = useQuery<{ socialWebhookSetup: WebhookAppStatus[] }>(SOCIAL_WEBHOOK_SETUP, { skip: !canManage, fetchPolicy: 'cache-and-network' });
  const deliveries = useQuery<{ socialWebhookDeliveries: WebhookDelivery[] }>(SOCIAL_WEBHOOK_DELIVERIES, {
    skip: !canManage,
    variables: { limit: DELIVERY_LIMIT },
    fetchPolicy: 'cache-and-network',
  });
  const [open, setOpen] = useState<WebhookDelivery | null>(null);
  const columns = useMemo(() => deliveryColumns(t, formatDateTime), [t, formatDateTime]);
  const rows = deliveries.data?.socialWebhookDeliveries;
  const fetchRows = useMemo(() => clientTableFetch(rows ?? [], searchOf, columns), [rows, columns]);

  if (!canManage) {
    return (
      <Alert severity="info" data-testid="webhooks-managers-only">
        {t('marketing.socialWebhooks.managersOnly')}
      </Alert>
    );
  }

  const apps = setup.data?.socialWebhookSetup ?? [];
  return (
    <Stack spacing={2} data-testid="webhooks-tab">
      <Alert severity="info">{t('marketing.socialWebhooks.intro')}</Alert>
      {setup.loading && !setup.data && <LinearProgress />}
      {setup.error && <Alert severity="error">{parseApiError(setup.error)}</Alert>}
      {setup.data && apps.length === 0 && (
        <Alert severity="warning" data-testid="webhooks-no-apps">
          {t('marketing.socialWebhooks.noApps')}
        </Alert>
      )}
      {apps.map((app) => (
        <WebhookAppCard key={app.app_id} app={app} canRegister={canManage} onChanged={() => refetch(setup.refetch)} />
      ))}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="h2">
          {t('marketing.socialWebhooks.deliveriesTitle')}
        </Typography>
        <DuncitButton startIcon={<RefreshIcon />} onClick={() => refetch(deliveries.refetch)} data-testid="webhooks-refresh">
          {t('marketing.socialWebhooks.refresh')}
        </DuncitButton>
      </Stack>
      {deliveries.error && <Alert severity="error">{parseApiError(deliveries.error)}</Alert>}
      <DuncitTable<WebhookDelivery>
        tableId="marketing-social-webhook-deliveries"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        onRowClick={setOpen}
        defaultSort={{ field: 'received_at', dir: 'desc' }}
        searchPlaceholder={t('marketing.socialWebhooks.search')}
        emptyText={t(deliveries.loading ? 'marketing.socialWebhooks.loading' : 'marketing.socialWebhooks.empty')}
        ariaLabel={t('marketing.socialWebhooks.deliveriesTitle')}
      />
      <DeliveryBodyDialog delivery={open} onClose={() => setOpen(null)} />
    </Stack>
  );
}
