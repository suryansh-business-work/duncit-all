import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { EM_DASH } from '@duncit/table';
import { QueryGuard, SectionCard, StatusChip, type StatusColorMap } from '@duncit/ui';
import InfoRows, { type InfoLine } from '../../components/InfoRows';
import { runAction } from '../../lib/actions';
import { money } from '../../lib/format';
import { graphqlUrl } from '../../runtime';
import { SHIPROCKET_RECONNECT, STORE_SHIPROCKET_STATUS, type ShiprocketStatus } from './queries';

/** The webhook URL to paste into ShipRocket: the API host plus the neutral path. */
const webhookUrl = (path: string) => `${new URL(graphqlUrl).origin}${path}`;

type Connection = 'CONNECTED' | 'REFUSED' | 'NOT_SET_UP';

const CONNECTION_COLORS: StatusColorMap = { CONNECTED: 'success', REFUSED: 'error', NOT_SET_UP: 'default' };
const CONNECTION_KEYS: Record<Connection, string> = {
  CONNECTED: 'ecommPortal.shipping.connected',
  REFUSED: 'ecommPortal.shipping.refused',
  NOT_SET_UP: 'ecommPortal.shipping.notSetUp',
};
const ON_OFF_COLORS: StatusColorMap = { ON: 'success', OFF: 'warning' };

function connectionOf(status: ShiprocketStatus): Connection {
  if (!status.configured) return 'NOT_SET_UP';
  return status.login_refused ? 'REFUSED' : 'CONNECTED';
}

interface StatusBodyProps {
  status: ShiprocketStatus;
  reconnecting: boolean;
  onReconnect: () => Promise<boolean>;
}

function StatusBody({ status, reconnecting, onReconnect }: Readonly<StatusBodyProps>) {
  const { t } = useTranslation();
  const connection = connectionOf(status);
  const webhookOn = status.webhook_key_set ? 'ON' : 'OFF';
  const wallet = status.wallet_balance === null ? EM_DASH : money(status.wallet_balance);
  const lines: InfoLine[] = [
    {
      key: 'connection',
      label: t('ecommPortal.shipping.connection'),
      value: <StatusChip status={connection} label={t(CONNECTION_KEYS[connection])} colorMap={CONNECTION_COLORS} />,
    },
    { key: 'account', label: t('ecommPortal.shipping.apiUser'), value: status.account_email || EM_DASH },
    { key: 'wallet', label: t('ecommPortal.shipping.wallet'), value: wallet, bold: true },
    { key: 'pickup', label: t('ecommPortal.shipping.defaultPickup'), value: status.default_pickup || EM_DASH },
    {
      key: 'key',
      label: t('ecommPortal.shipping.webhookKey'),
      value: <StatusChip status={webhookOn} label={status.webhook_key_set ? t('shell.common.yes') : t('shell.common.no')} colorMap={ON_OFF_COLORS} />,
    },
    { key: 'webhook', label: t('ecommPortal.shipping.webhookUrl'), value: webhookUrl(status.webhook_path) },
  ];
  return (
    <Stack spacing={1.5}>
      {status.configured ? null : <Alert severity="warning">{t('ecommPortal.shipping.notConfigured')}</Alert>}
      {status.login_refused ? (
        <Alert
          severity="error"
          action={
            <DuncitButton size="small" color="inherit" startIcon={<LoginIcon />} loading={reconnecting} onClick={onReconnect}>
              {t('ecommPortal.shipping.retryLogin')}
            </DuncitButton>
          }
        >
          {t('ecommPortal.shipping.loginRefused', { vars: { reason: status.login_message } })}
        </Alert>
      ) : null}
      {status.wallet_error ? (
        <Alert severity="warning">{t('ecommPortal.shipping.walletUnread', { vars: { reason: status.wallet_error } })}</Alert>
      ) : null}
      {status.webhook_key_set ? null : <Alert severity="info">{t('ecommPortal.shipping.webhookHint')}</Alert>}
      <InfoRows lines={lines} />
    </Stack>
  );
}

/** The ShipRocket account at a glance: connection, API user, wallet, webhook. */
export default function AccountStatusCard() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(STORE_SHIPROCKET_STATUS, { fetchPolicy: 'network-only' });
  const [reconnect, reconnectState] = useMutation(SHIPROCKET_RECONNECT, { refetchQueries: ['StoreShiprocketStatus'] });
  const status = data?.storeShiprocketStatus;
  const onReconnect = () => runAction(() => reconnect(), t('ecommPortal.shipping.reconnected'));
  return (
    <SectionCard title={t('ecommPortal.shipping.account')}>
      <QueryGuard loading={loading && !status} error={error}>
        {() => status && <StatusBody status={status} reconnecting={reconnectState.loading} onReconnect={onReconnect} />}
      </QueryGuard>
    </SectionCard>
  );
}
