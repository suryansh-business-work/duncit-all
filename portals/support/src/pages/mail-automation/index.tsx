import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import type { TableFetch } from '@duncit/table';
import {
  MAIL_AUTOMATION_ACCOUNTS,
  type MailAutomationAccount,
} from '../../graphql/mail-automation';
import MailboxRulesTable from './MailboxRulesTable';
import { MailAutomationRuleForm } from './mail-automation-rule';
import RecentThreads from './RecentThreads';

/**
 * Support > Mail Automation.
 *
 * The mailboxes are a table; the rule behind each one is the three-step wizard
 * in the dialog. Connecting and disconnecting is the Tech portal's — this page
 * can pause a mailbox and decide what it says, but never adds or removes one.
 */
export default function MailAutomationPage() {
  const { t } = useTranslation();
  const refetchRef = useRef<(() => void) | null>(null);
  const { data, loading, error, refetch } = useQuery<{
    mailAutomationAccounts: MailAutomationAccount[];
  }>(MAIL_AUTOMATION_ACCOUNTS, { fetchPolicy: 'cache-and-network' });

  const [editingId, setEditingId] = useState('');
  /*
    The row that opened the dialog, held so the dialog cannot vanish.

    `editing` below prefers the LIVE row — a save refetches, and the wizard
    should re-render with what was actually stored. But a refetch that
    momentarily empties the list would otherwise close the dialog underneath an
    operator halfway through writing a reply message. Nothing but an explicit
    Save or Close may take this dialog away.
  */
  const [opened, setOpened] = useState<MailAutomationAccount | null>(null);
  const rows = data?.mailAutomationAccounts;

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

  const onConfigure = useCallback((account: MailAutomationAccount) => {
    setOpened(account);
    setEditingId(account.id);
  }, []);

  const closeDialog = () => {
    setEditingId('');
    setOpened(null);
  };

  const editing = rows?.find((row) => row.id === editingId) ?? opened;

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title={t('support.mailAutomation.title')}
        subtitle={t('support.mailAutomation.subtitle')}
      />

      {error && <Alert severity="error">{error.message}</Alert>}

      {loading && !data ? (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress />
        </Stack>
      ) : null}

      <MailboxRulesTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onConfigure={onConfigure}
      />

      {editingId && <RecentThreads accountId={editingId} />}

      {/* Closes on Save or on Close, and on nothing else. The wizard holds an
          unsaved reply message, so a stray backdrop click or an Escape must not
          throw away what somebody has just written. */}
      <Dialog
        open={Boolean(editing)}
        onClose={(_event, reason) => {
          if (reason !== 'backdropClick') closeDialog();
        }}
        fullWidth
        maxWidth="md"
        disableEscapeKeyDown
      >
        {editing && (
          <>
            <DialogTitle>
              {t('support.mailAutomation.editTitle', { vars: { email: editing.email } })}
            </DialogTitle>
            <DialogContent dividers>
              <MailAutomationRuleForm
                account={editing}
                onSaved={() => {
                  refetch().catch(() => undefined);
                  closeDialog();
                }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={closeDialog}>{t('support.mailAutomation.close')}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Stack>
  );
}
