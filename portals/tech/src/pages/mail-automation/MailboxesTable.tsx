import { useMemo, type MutableRefObject } from 'react';
import { Chip, Typography } from '@mui/material';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { formatDateTime } from '../server/format';
import type { MailAutomationAccount } from './queries';

/** Queue names, keyed by the server's enum so a new type is a compile error
 * here rather than a blank cell. */
const QUEUE_LABEL: Record<MailAutomationAccount['ticket_type'], string> = {
  SUPPORT: 'support.mailAutomation.ticketSupport',
  GRIEVANCE: 'support.mailAutomation.ticketGrievance',
  REPORT_PROBLEM: 'support.mailAutomation.ticketReport',
};

const getRowId = (row: MailAutomationAccount) => row.id;

/** Search matches the mailbox address. */
const mailboxOf = (row: MailAutomationAccount) => row.email;

interface Props {
  /** Every connected mailbox; undefined while the list is loading. */
  rows: readonly MailAutomationAccount[] | undefined;
  refetchRef: MutableRefObject<(() => void) | null>;
  disconnecting: boolean;
  onDisconnect: (account: MailAutomationAccount) => void;
}

/**
 * The connected mailboxes, as a table.
 *
 * Every column here is read-only. Connecting and disconnecting is Tech's, and
 * that is the one action the row carries; the reply message and the queue
 * belong to Support and are shown only so an operator can see what the Google
 * grant is being used for.
 */
export default function MailboxesTable({
  rows,
  refetchRef,
  disconnecting,
  onDisconnect,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<MailAutomationAccount>[]>(() => {
    const renderState = (row: MailAutomationAccount) => {
      if (!row.is_connected) {
        return <Chip size="small" color="error" label={t('tech.mailAutomation.grantLost')} />;
      }
      if (!row.is_active) {
        return <Chip size="small" color="warning" label={t('tech.mailAutomation.paused')} />;
      }
      return <Chip size="small" color="success" label={t('tech.mailAutomation.running')} />;
    };

    const renderMailbox = (row: MailAutomationAccount) => (
      <Typography variant="body2" noWrap title={row.email} sx={{
        fontWeight: 700
      }}>
        {row.email}
      </Typography>
    );

    const renderWriter = (row: MailAutomationAccount) => (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {t(row.ai_enabled ? 'tech.mailAutomation.aiOn' : 'tech.mailAutomation.aiOff')}
      </Typography>
    );

    // The server's own words when a poll failed — it names the exact Google or
    // Gmail error, which is the only actionable text there is. A mailbox the
    // poller has not reached yet says so, rather than showing a bare dash that
    // reads the same as a failure.
    const renderLastChecked = (row: MailAutomationAccount) => {
      let text = formatDateTime(row.last_polled_at);
      if (row.last_error) text = row.last_error;
      else if (!row.last_polled_at) text = t('tech.mailAutomation.neverPolled');
      return (
        <Typography variant="body2" color={row.last_error ? 'error.main' : 'text.secondary'}>
          {text}
        </Typography>
      );
    };

    const renderActions = (row: MailAutomationAccount) => (
      <DuncitButton
        size="small"
        color="error"
        variant="outlined"
        startIcon={<LinkOffIcon />}
        disabled={disconnecting}
        onClick={() => onDisconnect(row)}
      >
        {t('tech.mailAutomation.disconnect')}
      </DuncitButton>
    );

    const queueOptions = Object.entries(QUEUE_LABEL).map(([value, key]) => ({ value, label: t(key) }));

    return [
      { field: 'email', headerName: t('support.mailAutomation.colMailbox'), flex: 1.4, minWidth: 220, type: 'text', cellRenderer: renderMailbox },
      { field: 'is_active', headerName: t('support.mailAutomation.colState'), width: 150, type: 'boolean', cellRenderer: renderState },
      {
        field: 'ticket_type',
        headerName: t('support.mailAutomation.colOpens'),
        width: 170,
        type: 'enum',
        options: queueOptions,
        valueGetter: (row) => t(QUEUE_LABEL[row.ticket_type]),
      },
      { field: 'sla_label', headerName: t('support.mailAutomation.colRepliesIn'), width: 130, type: 'text' },
      { field: 'ai_enabled', headerName: t('support.mailAutomation.colWriter'), width: 180, type: 'boolean', cellRenderer: renderWriter },
      {
        field: 'last_polled_at',
        headerName: t('support.mailAutomation.colLastChecked'),
        flex: 1,
        minWidth: 190,
        type: 'date',
        cellRenderer: renderLastChecked,
      },
      {
        field: 'connected_at',
        headerName: t('support.mailAutomation.colConnected'),
        width: 190,
        type: 'date',
        valueGetter: (row) => formatDateTime(row.connected_at),
      },
      { field: 'actions', headerName: '', width: 150, type: 'actions', cellRenderer: renderActions },
    ];
  }, [t, disconnecting, onDisconnect]);

  // The list is small and unpaginated on the server, so search, filters, sort
  // and paging all run in memory.
  const fetchRows = useMemo(
    () => clientTableFetch<MailAutomationAccount>(rows ?? [], mailboxOf, columns),
    [rows, columns]
  );

  return (
    <DuncitTable<MailAutomationAccount>
      tableId="tech-mail-automation"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.mailAutomation.empty')}
      defaultSort={{ field: 'connected_at', dir: 'desc' }}
      searchPlaceholder={t('support.mailAutomation.searchMailbox')}
      refetchRef={refetchRef}
    />
  );
}
