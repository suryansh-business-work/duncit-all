import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack, Typography } from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader } from '@duncit/ui';
import { notify, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { TableFetch } from '@duncit/table';
import { urlConfigs } from '../../config/url-configs';
import MailboxesTable from './MailboxesTable';
import { useConnectOutcome } from './useConnectOutcome';
import {
  DISCONNECT_MAIL_AUTOMATION_ACCOUNT,
  MAIL_AUTOMATION_ACCOUNTS,
  MAIL_AUTOMATION_CONFIGURED,
  MAIL_AUTOMATION_CONNECT_URL,
  type MailAutomationAccount,
} from './queries';

/** The redirect URI Google must have registered, spelled out so nobody has to
 * guess it. Derived from the GraphQL URL because that is the one server
 * address this portal already knows. */
const redirectUri = `${urlConfigs.graphqlUrl.replace('/graphql', '')}/gmail/oauth/callback`;

/**
 * Tech > Mail Automation: step 1, and ONLY step 1.
 *
 * Connecting a mailbox hands Duncit a Google grant, which is a credential and
 * therefore Tech's. What the mailbox then says, and which queue it opens, is a
 * promise made to whoever wrote in — that belongs to Support, and lives in the
 * Support portal. This page shows the rule but never edits it.
 */
export default function MailAutomationPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const refetchRef = useRef<(() => void) | null>(null);

  const configured = useQuery<{ mailAutomationConfigured: boolean }>(MAIL_AUTOMATION_CONFIGURED, {
    fetchPolicy: 'cache-and-network',
  });
  const accounts = useQuery<{ mailAutomationAccounts: MailAutomationAccount[] }>(
    MAIL_AUTOMATION_ACCOUNTS,
    { fetchPolicy: 'cache-and-network' }
  );
  const [connectUrl, connecting] = useMutation<{ mailAutomationConnectUrl: string }>(
    MAIL_AUTOMATION_CONNECT_URL
  );
  const [disconnect, disconnecting] = useMutation<any>(DISCONNECT_MAIL_AUTOMATION_ACCOUNT, {
    refetchQueries: [MAIL_AUTOMATION_ACCOUNTS],
  });

  const { connectError, setConnectError, reconnectWarning, setReconnectWarning } =
    useConnectOutcome(() => {
      accounts.refetch().catch(() => undefined);
    });

  const rows = accounts.data?.mailAutomationAccounts;

  /**
   * The list is small and unpaginated on the server, so the table filters and
   * sorts it in memory. Search is honoured because an operator with a dozen
   * mailboxes will reach for it; paging is left to the table.
   */
  const fetchRows = useCallback<TableFetch<MailAutomationAccount>>(
    async (query) => {
      const all = rows ?? [];
      const term = query.search.trim().toLowerCase();
      const matched = term ? all.filter((row) => row.email.toLowerCase().includes(term)) : all;
      return { rows: matched, total: matched.length };
    },
    [rows]
  );

  // The table caches its page until told otherwise, so a refetched list has to
  // push itself in rather than wait to be asked.
  useEffect(() => {
    refetchRef.current?.();
  }, [rows]);

  const startConnect = async () => {
    try {
      const { data } = await connectUrl();
      const url = data?.mailAutomationConnectUrl;
      if (url) globalThis.location.assign(url);
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const askDisconnect = async (account: MailAutomationAccount) => {
    const ok = await confirm({
      title: t('tech.mailAutomation.disconnectTitle', { vars: { email: account.email } }),
      message: t('tech.mailAutomation.disconnectMessage'),
      confirmLabel: t('tech.mailAutomation.disconnect'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await disconnect({ variables: { id: account.id } });
      notify(t('tech.mailAutomation.disconnected', { vars: { email: account.email } }), 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  if (configured.loading && !configured.data) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          py: 6
        }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (configured.data?.mailAutomationConfigured !== true) {
    return (
      <Stack spacing={2.5}>
        <PageHeader title={t('tech.mailAutomation.title')} subtitle={t('tech.mailAutomation.subtitle')} />
        <Alert severity="warning">{t('tech.mailAutomation.notConfigured')}</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <PageHeader title={t('tech.mailAutomation.title')} subtitle={t('tech.mailAutomation.subtitle')} />

      <Alert severity="info">
        {t('tech.mailAutomation.scopeHint', { vars: { redirect: redirectUri } })}
      </Alert>

      {/* Re-authorising a mailbox that was already set up. Worth a warning
          rather than a tick: the operator may not have realised, and the thing
          they need told is that Support's rule was left alone. */}
      {reconnectWarning && (
        <Alert severity="warning" onClose={() => setReconnectWarning('')}>
          {t('tech.mailAutomation.alreadyConnected', { vars: { email: reconnectWarning } })}
        </Alert>
      )}

      {/* Google's or Gmail's own words. Kept verbatim — "Gmail API has not been
          used in this project before or it is disabled" is the whole answer,
          and paraphrasing it would throw away the only actionable text. */}
      {connectError && (
        <Alert severity="error" onClose={() => setConnectError('')}>
          {t('tech.mailAutomation.connectFailed', { vars: { reason: connectError } })}
        </Alert>
      )}

      <Stack direction="row">
        <DuncitButton
          variant="contained"
          startIcon={<MarkEmailReadIcon />}
          disabled={connecting.loading}
          onClick={startConnect}
        >
          {connecting.loading ? t('tech.mailAutomation.connecting') : t('tech.mailAutomation.connect')}
        </DuncitButton>
      </Stack>

      {accounts.error && <Alert severity="error">{accounts.error.message}</Alert>}

      <MailboxesTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        disconnecting={disconnecting.loading}
        onDisconnect={askDisconnect}
      />

      {/* Everything in that table except the mailbox itself is read-only here.
          Saying where it IS editable saves a hunt for a button this page will
          never have. */}
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t('tech.mailAutomation.ruleHint')}
      </Typography>
    </Stack>
  );
}
