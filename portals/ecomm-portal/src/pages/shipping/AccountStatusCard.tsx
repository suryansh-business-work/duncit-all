import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { EM_DASH } from '@duncit/table';
import { QueryGuard, SectionCard } from '@duncit/ui';
import InfoRows, { type InfoLine } from '../../components/InfoRows';
import { money } from '../../lib/format';
import { graphqlUrl } from '../../runtime';
import { STORE_SHIPROCKET_STATUS, type ShiprocketStatus } from './queries';

/** The webhook URL to paste into ShipRocket: the API host plus the neutral path. */
const webhookUrl = (path: string) => `${new URL(graphqlUrl).origin}${path}`;

function StatusBody({ status }: Readonly<{ status: ShiprocketStatus }>) {
  const { t } = useTranslation();
  const yesNo = (on: boolean) => (on ? t('shell.common.yes') : t('shell.common.no'));
  const wallet = status.wallet_balance === null ? EM_DASH : money(status.wallet_balance);
  const lines: InfoLine[] = [
    { key: 'configured', label: t('ecommPortal.shipping.configured'), value: yesNo(status.configured) },
    { key: 'wallet', label: t('ecommPortal.shipping.wallet'), value: wallet, bold: true },
    { key: 'pickup', label: t('ecommPortal.shipping.defaultPickup'), value: status.default_pickup || EM_DASH },
    { key: 'key', label: t('ecommPortal.shipping.webhookKey'), value: yesNo(status.webhook_key_set) },
    { key: 'webhook', label: t('ecommPortal.shipping.webhookUrl'), value: webhookUrl(status.webhook_path) },
  ];
  return (
    <Stack spacing={1.5}>
      {status.configured ? null : <Alert severity="warning">{t('ecommPortal.shipping.notConfigured')}</Alert>}
      {status.login_refused ? (
        <Alert severity="error">{t('ecommPortal.shipping.loginRefused', { vars: { reason: status.login_message } })}</Alert>
      ) : null}
      {status.webhook_key_set ? null : <Alert severity="info">{t('ecommPortal.shipping.webhookHint')}</Alert>}
      <InfoRows lines={lines} />
    </Stack>
  );
}

/** The ShipRocket account at a glance: credentials, wallet, webhook. */
export default function AccountStatusCard() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(STORE_SHIPROCKET_STATUS, { fetchPolicy: 'network-only' });
  const status = data?.storeShiprocketStatus;
  return (
    <SectionCard title={t('ecommPortal.shipping.account')}>
      <QueryGuard loading={loading && !status} error={error}>
        {() => status && <StatusBody status={status} />}
      </QueryGuard>
    </SectionCard>
  );
}
