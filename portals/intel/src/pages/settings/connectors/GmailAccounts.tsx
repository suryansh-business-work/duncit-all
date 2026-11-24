import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Button, List, ListItem, ListItemIcon, ListItemText, Paper, Skeleton, Stack, Typography } from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import GoogleIcon from '@mui/icons-material/Google';
import type { IntelGmailAccount } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { fireAndForget } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import { INTEL_DISCONNECT_GMAIL, INTEL_GMAIL_ACCOUNTS, INTEL_GMAIL_CONNECT_URL, type GmailAccountsData, type GmailConnectUrlData } from '../../../graphql/admin';
import { INTEL_BOOTSTRAP } from '../../../graphql/chat';
import { intelLog } from '../../../lib/logger';
import { relativeTime } from '../../../lib/time';

/** The outcome Google's round trip left in the address bar, shown once and then cleared. */
function useConnectOutcome(onDone: () => void) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const handled = useRef('');
  const connected = params.get('connected') ?? '';
  const error = params.get('error') ?? '';
  useEffect(() => {
    const key = `${connected}|${error}`;
    if ((!connected && !error) || handled.current === key) return;
    handled.current = key;
    if (connected) notifySuccess(t('intel.settings.gmail.connected', { vars: { email: connected } }));
    else notifyError(error === 'access_denied' ? t('intel.settings.gmail.cancelled') : t('intel.settings.gmail.connectFailed', { vars: { reason: error } }));
    setParams({}, { replace: true });
    onDone();
  }, [connected, error, setParams, t, onDone]);
}

/** Settings › Gmail: mailboxes connected with Google (read-only), as many as needed. Each one is indexed by its own connector below. */
export default function GmailAccounts({ onChanged }: Readonly<{ onChanged: () => void }>) {
  const { t } = useTranslation();
  const accounts = useQuery<GmailAccountsData>(INTEL_GMAIL_ACCOUNTS, { fetchPolicy: 'cache-and-network' });
  const [connectUrl, connecting] = useMutation<GmailConnectUrlData>(INTEL_GMAIL_CONNECT_URL);
  const [disconnect, disconnecting] = useMutation(INTEL_DISCONNECT_GMAIL, { refetchQueries: [INTEL_BOOTSTRAP] });
  const [confirm, setConfirm] = useState<IntelGmailAccount | null>(null);
  const refresh = () => {
    fireAndForget(accounts.refetch(), intelLog, '/setting', 'GmailAccounts.refetch');
    onChanged();
  };
  useConnectOutcome(refresh);

  const connect = async () => {
    try {
      const res = await connectUrl();
      if (res.data) window.location.assign(res.data.intelGmailConnectUrl);
    } catch (err) {
      notifyError(parseApiError(err, t('intel.settings.connectors.actionFailed')));
    }
  };
  const remove = async (account: IntelGmailAccount) => {
    setConfirm(null);
    try {
      await disconnect({ variables: { id: account.id } });
      notifySuccess(t('intel.settings.gmail.disconnected'));
      refresh();
    } catch (err) {
      notifyError(parseApiError(err, t('intel.settings.connectors.actionFailed')));
    }
  };
  const rows = accounts.data?.intelGmailAccounts ?? [];

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('intel.settings.gmail.accounts')}</Typography>
        <DuncitButton variant="contained" startIcon={<GoogleIcon />} loading={connecting.loading || undefined} onClick={() => fireAndForget(connect(), intelLog, '/setting', 'GmailAccounts.connect')}>
          {t('intel.settings.gmail.connect')}
        </DuncitButton>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t('intel.settings.gmail.readOnlyNote')}</Typography>
      {accounts.error && <Alert severity="error" sx={{ mt: 1.5 }} action={<Button color="inherit" size="small" onClick={refresh}>{t('intel.common.retry')}</Button>}>{t('intel.settings.gmail.loadFailed')}</Alert>}
      {accounts.loading && !accounts.data && <Skeleton variant="rounded" height={56} sx={{ mt: 1.5 }} />}
      {accounts.data && rows.length === 0 && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          {t('intel.settings.gmail.empty')} {t('intel.settings.gmail.emptyBody')}
        </Alert>
      )}
      {rows.length > 0 && (
        <List dense sx={{ mt: 1 }}>
          {rows.map((a) => (
            <ListItem key={a.id} disableGutters secondaryAction={<Button size="small" color="error" disabled={disconnecting.loading} onClick={() => setConfirm(a)}>{t('intel.settings.gmail.disconnect')}</Button>}>
              <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                <EmailOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={a.email} secondary={t('intel.settings.gmail.connectedSince', { vars: { when: relativeTime(a.connected_at, t) } })} slotProps={{ primary: { noWrap: true } }} />
            </ListItem>
          ))}
        </List>
      )}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={t('intel.settings.gmail.disconnectTitle')}
        message={t('intel.settings.gmail.disconnectText', { vars: { email: confirm?.email ?? '' } })}
        destructive
        confirmLabel={t('intel.settings.gmail.disconnect')}
        onConfirm={() => confirm && fireAndForget(remove(confirm), intelLog, '/setting', 'GmailAccounts.disconnect')}
        onClose={() => setConfirm(null)}
      />
    </Paper>
  );
}
