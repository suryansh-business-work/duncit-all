import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Card, CardContent, Divider, Snackbar, Stack, Typography } from '@mui/material';
import ConfirmDialog from '../../components/ConfirmDialog';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import { useTranslation } from '../../i18n/useTranslation';
import { useDateFormat } from '../../utils/dateFormat';
import { parseApiError } from '../../utils/parseApiError';
import ConnectedAccountRow from './ConnectedAccountRow';
import {
  CONNECT_GOOGLE_ACCOUNT,
  DISCONNECT_GOOGLE_ACCOUNT,
  MY_CONNECTED_ACCOUNTS,
  type ConnectedAccounts,
} from './connected-queries';

/**
 * Profile > Connected accounts — what this account can sign in with, and the
 * connect/disconnect controls for Google.
 *
 * Disconnect is refused (here AND on the server) when there is no password:
 * Google would be the only way in. The server is the real gate; this only
 * explains it before the user tries. Native twin.
 */
export default function ConnectedAccountsSection() {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { data, loading } = useQuery<{ myConnectedAccounts: ConnectedAccounts }>(
    MY_CONNECTED_ACCOUNTS
  );
  const [connectGoogle, { loading: connecting }] = useMutation(CONNECT_GOOGLE_ACCOUNT, {
    refetchQueries: [MY_CONNECTED_ACCOUNTS],
  });
  const [disconnectGoogle, { loading: disconnecting }] = useMutation(DISCONNECT_GOOGLE_ACCOUNT, {
    refetchQueries: [MY_CONNECTED_ACCOUNTS],
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const accounts = data?.myConnectedAccounts;
  const google = accounts?.google ?? null;
  const canDisconnect = !!accounts?.has_password;

  const handleConnect = async (idToken: string) => {
    setError(null);
    try {
      await connectGoogle({ variables: { input: { id_token: idToken } } });
      setToast(t('mweb.account.connected.connected'));
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    try {
      await disconnectGoogle();
      setConfirmOpen(false);
      setToast(t('mweb.account.connected.disconnected'));
    } catch (e) {
      setConfirmOpen(false);
      setError(parseApiError(e));
    }
  };

  const linkedOn = google?.linked_at
    ? t('mweb.account.connected.linkedOn', { vars: { date: formatDate(google.linked_at) } })
    : null;

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('mweb.account.connected.title')}
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {t('mweb.account.connected.subtitle')}
            </Typography>
          </Stack>

          <ConnectedAccountRow
            label={t('mweb.account.connected.emailLabel')}
            value={accounts?.email ?? ''}
            status={
              accounts?.has_password
                ? t('mweb.account.connected.emailOn')
                : t('mweb.account.connected.emailOff')
            }
            connected={!!accounts?.has_password}
          />

          <Divider />

          <ConnectedAccountRow
            label={t('mweb.account.connected.googleLabel')}
            value={google?.google_email ?? t('mweb.account.connected.googleNotConnected')}
            status={linkedOn ?? undefined}
            connected={!!google}
            busy={loading || connecting || disconnecting}
            disconnectLabel={t('mweb.account.connected.disconnect')}
            onDisconnect={canDisconnect ? () => setConfirmOpen(true) : undefined}
            hint={google && !canDisconnect ? t('mweb.account.connected.onlyMethodHint') : undefined}
            connectControl={
              google ? undefined : (
                <GoogleSignInButton
                  text="continue_with"
                  loading={connecting}
                  onCredential={(idToken) => {
                    handleConnect(idToken).catch(() => undefined);
                  }}
                />
              )
            }
          />

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Stack>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        title={t('mweb.account.connected.disconnectTitle')}
        message={t('mweb.account.connected.disconnectMessage')}
        confirmLabel={t('mweb.account.connected.disconnect')}
        destructive
        busy={disconnecting}
        onConfirm={() => {
          handleDisconnect().catch(() => undefined);
        }}
        onClose={() => setConfirmOpen(false)}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast(null)}>
          {toast}
        </Alert>
      </Snackbar>
    </Card>
  );
}
