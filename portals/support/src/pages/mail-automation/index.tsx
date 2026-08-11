import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, CircularProgress, Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import {
  MAIL_AUTOMATION_ACCOUNTS,
  type MailAutomationAccount,
} from '../../graphql/mail-automation';
import { MailAutomationRuleForm } from './mail-automation-rule';
import RecentThreads from './RecentThreads';

/**
 * Support > Mail Automation: steps 2 and 3, plus the mailbox picker that
 * step 1 is reduced to here.
 *
 * The mailboxes themselves are connected in the Tech portal — this page can
 * choose between them and pause one, but never adds or removes one. Everything
 * that decides what a sender actually receives lives here.
 */
export default function MailAutomationPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ mailAutomationAccounts: MailAutomationAccount[] }>(
    MAIL_AUTOMATION_ACCOUNTS,
    { fetchPolicy: 'cache-and-network' }
  );
  const [selectedId, setSelectedId] = useState('');

  const accounts = data?.mailAutomationAccounts ?? [];

  // Land on the first mailbox, and recover if the selected one is disconnected
  // from the Tech portal while this page is open.
  useEffect(() => {
    if (accounts.length === 0) return;
    if (accounts.some((a) => a.id === selectedId)) return;
    setSelectedId(accounts[0].id);
  }, [accounts, selectedId]);

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

      {!loading && !error && accounts.length === 0 ? (
        <Alert severity="info">{t('support.mailAutomation.empty')}</Alert>
      ) : null}

      {selectedId && accounts.length > 0 && (
        <>
          <MailAutomationRuleForm
            accounts={accounts}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <RecentThreads accountId={selectedId} />
        </>
      )}
    </Stack>
  );
}
