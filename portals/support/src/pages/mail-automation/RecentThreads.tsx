import { useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Chip, Stack, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import {
  MAIL_AUTOMATION_THREADS,
  type MailAutomationThread,
} from '../../graphql/mail-automation';
import { formatDateTime } from '@duncit/app-settings';

const getRowId = (row: MailAutomationThread) => row.id;
const when = (iso: string | null) => (iso ? formatDateTime(iso) : '');

/**
 * What the mailbox has actually done.
 *
 * The rule above is a promise; this is the record of it being kept — including
 * the cases where the ticket opened but the acknowledgement never left, which
 * is a different failure from never having been picked up at all.
 */
export default function RecentThreads({ accountId }: Readonly<{ accountId: string }>) {
  const { t } = useTranslation();
  const { data } = useQuery<{ mailAutomationThreads: MailAutomationThread[] }>(
    MAIL_AUTOMATION_THREADS,
    { variables: { account_id: accountId, limit: 100 }, fetchPolicy: 'cache-and-network' }
  );
  const rows = data?.mailAutomationThreads;

  const fetchRows = useCallback<TableFetch<MailAutomationThread>>(
    async (query) => {
      const all = rows ?? [];
      const term = query.search.trim().toLowerCase();
      const matched = term
        ? all.filter((r) =>
            [r.from_email, r.from_name, r.subject, r.ticket_no].some((v) =>
              v.toLowerCase().includes(term)
            )
          )
        : all;
      return { rows: matched, total: matched.length };
    },
    [rows]
  );

  const columns = useMemo<DuncitColumn<MailAutomationThread>[]>(() => {
    // Three states, not two. A thread with no reply and no error was claimed
    // but never finished — rendering that as "reply failed: " with a blank
    // reason reads like a bug in this page rather than what actually happened.
    const renderStatus = (row: MailAutomationThread) => {
      if (row.replied_at) {
        return (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('support.mailAutomation.recentReplied', { vars: { when: when(row.replied_at) } })}
          </Typography>
        );
      }
      const text = row.reply_error
        ? t('support.mailAutomation.recentFailed', { vars: { reason: row.reply_error } })
        : t('support.mailAutomation.recentPending');
      return (
        <Typography variant="body2" title={row.reply_error || undefined} sx={{
          color: "error.main"
        }}>
          {text}
        </Typography>
      );
    };

    const renderSubject = (row: MailAutomationThread) => (
      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          alignItems: "center",
          minWidth: 0
        }}>
        <Typography variant="body2" noWrap title={row.subject} sx={{
          fontWeight: 600
        }}>
          {row.subject}
        </Typography>
        {row.reply_by_ai && <SmartToyIcon fontSize="small" color="action" />}
      </Stack>
    );

    const renderTicket = (row: MailAutomationThread) => (
      <Chip size="small" label={row.ticket_no || '—'} />
    );

    return [
      {
        field: 'ticket_no',
        headerName: t('support.mailAutomation.colTicket'),
        width: 150,
        cellRenderer: renderTicket,
      },
      {
        field: 'from_email',
        headerName: t('support.mailAutomation.colFrom'),
        flex: 1,
        minWidth: 200,
        valueGetter: (row) => row.from_name || row.from_email,
      },
      {
        field: 'subject',
        headerName: t('support.mailAutomation.colSubject'),
        flex: 1.4,
        minWidth: 220,
        cellRenderer: renderSubject,
      },
      {
        field: 'replied_at',
        headerName: t('support.mailAutomation.colStatus'),
        flex: 1.2,
        minWidth: 220,
        sortable: false,
        cellRenderer: renderStatus,
      },
      {
        field: 'created_at',
        headerName: t('support.mailAutomation.colReceived'),
        width: 190,
        valueGetter: (row) => when(row.created_at),
      },
    ];
  }, [t]);

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1" sx={{
        fontWeight: 800
      }}>
        {t('support.mailAutomation.recentTitle')}
      </Typography>
      <DuncitTable<MailAutomationThread>
        tableId="support-mail-automation-threads"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('support.mailAutomation.recentEmpty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('support.mailAutomation.colSubject')}
      />
    </Stack>
  );
}
