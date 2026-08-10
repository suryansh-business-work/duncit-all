import { useCallback, useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import {
  MobileConnectGoogleAccountDocument,
  MobileDisconnectGoogleAccountDocument,
  MobileMyConnectedAccountsDocument,
} from '@/graphql/account';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { formatDate } from '@/utils/date-format';
import { toErrorMessage } from '@/utils/errors';
import { ConnectedAccountRow } from './ConnectedAccountRow';

interface ConnectedAccounts {
  email?: string | null;
  has_password: boolean;
  google?: { google_email: string; linked_at?: string | null } | null;
}

/**
 * Profile > Connected accounts — what this account can sign in with, and the
 * connect/disconnect controls for Google.
 *
 * Disconnect is refused (here AND on the server) when there is no password:
 * Google would be the only way in. The server is the real gate; this only
 * explains it before the user tries. mWeb twin.
 */
export function ConnectedAccountsSection() {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const [accounts, setAccounts] = useState<ConnectedAccounts | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await graphqlRequest(MobileMyConnectedAccountsDocument, undefined, {
        auth: true,
      });
      setAccounts(data.myConnectedAccounts);
    } catch (e) {
      setError(toErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const connect = async (idToken: string) => {
    setError(null);
    setBusy(true);
    try {
      const data = await graphqlRequest(
        MobileConnectGoogleAccountDocument,
        { input: { id_token: idToken } },
        { auth: true },
      );
      setAccounts(data.connectGoogleAccount);
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.account.connected.connectFailed')));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setError(null);
    setConfirmOpen(false);
    setBusy(true);
    try {
      const data = await graphqlRequest(MobileDisconnectGoogleAccountDocument, undefined, {
        auth: true,
      });
      setAccounts(data.disconnectGoogleAccount);
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.account.connected.disconnectFailed')));
    } finally {
      setBusy(false);
    }
  };

  const google = accounts?.google ?? null;
  const canDisconnect = !!accounts?.has_password;
  const linkedOn = google?.linked_at
    ? t('mweb.account.connected.linkedOn', { vars: { date: formatDate(google.linked_at) } })
    : undefined;

  return (
    <YStack gap={10} testID="account-connected-section">
      <Text fontSize={14} fontWeight="700" color="$color">
        {t('mweb.account.connected.title')}
      </Text>
      <Text fontSize={12} color="$muted">
        {t('mweb.account.connected.subtitle')}
      </Text>

      <ConnectedAccountRow
        testID="connected-email"
        label={t('mweb.account.connected.emailLabel')}
        value={accounts?.email ?? ''}
        status={
          accounts?.has_password
            ? t('mweb.account.connected.emailOn')
            : t('mweb.account.connected.emailOff')
        }
        connected={!!accounts?.has_password}
      />

      <ConnectedAccountRow
        testID="connected-google"
        label={t('mweb.account.connected.googleLabel')}
        value={google?.google_email ?? t('mweb.account.connected.googleNotConnected')}
        status={linkedOn}
        connected={!!google}
        actionLabel={google && canDisconnect ? t('mweb.account.connected.disconnect') : undefined}
        onAction={google && canDisconnect ? () => setConfirmOpen(true) : undefined}
        busy={busy}
        hint={google && !canDisconnect ? t('mweb.account.connected.onlyMethodHint') : undefined}
      />

      {google ? null : (
        <GoogleAuthButton
          label={t('mweb.account.connected.connect')}
          disabled={busy}
          onIdToken={(idToken) => {
            connect(idToken).catch(() => undefined);
          }}
          onError={setError}
        />
      )}

      {error ? (
        <XStack alignItems="center" gap={6}>
          <MaterialIcons name="error-outline" size={16} color={muted} />
          <Text testID="connected-error" fontSize={12} color="$danger" flex={1}>
            {error}
          </Text>
        </XStack>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        testID="disconnect-google-confirm"
        title={t('mweb.account.connected.disconnectTitle')}
        message={t('mweb.account.connected.disconnectMessage')}
        confirmLabel={t('mweb.account.connected.disconnect')}
        destructive
        onConfirm={() => {
          disconnect().catch(() => undefined);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </YStack>
  );
}
