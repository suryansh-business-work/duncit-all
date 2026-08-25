import { useMemo, type MutableRefObject } from 'react';
import { Button, Chip, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import type { MailAutomationAccount } from '../../graphql/mail-automation';

const QUEUE_LABEL: Record<MailAutomationAccount['ticket_type'], string> = {
  SUPPORT: 'support.mailAutomation.ticketSupport',
  GRIEVANCE: 'support.mailAutomation.ticketGrievance',
  REPORT_PROBLEM: 'support.mailAutomation.ticketReport',
};

const getRowId = (row: MailAutomationAccount) => row.id;

interface Props {
  fetchRows: TableFetch<MailAutomationAccount>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onConfigure: (account: MailAutomationAccount) => void;
}

/**
 * Every connected mailbox and the rule Support has written for it.
 *
 * The rule is edited in the wizard behind Configure, not inline: the three
 * steps ask for a reply message, a queue and a promised response time, and
 * those are decisions to make together rather than cells to tab through.
 */
export default function MailboxRulesTable({
  fetchRows,
  refetchRef,
  onConfigure,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<MailAutomationAccount>[]>(() => {
    const renderState = (row: MailAutomationAccount) => {
      if (!row.is_connected) {
        return (
          <Chip size="small" color="error" label={t('support.mailAutomation.mailboxNotConnected')} />
        );
      }
      if (!row.is_active) {
        return (
          <Chip size="small" color="warning" label={t('support.mailAutomation.automationPaused')} />
        );
      }
      return (
        <Chip size="small" color="success" label={t('support.mailAutomation.automationActive')} />
      );
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
        {t(
          row.ai_enabled ? 'support.mailAutomation.previewByAi' : 'support.mailAutomation.previewByTemplate'
        )}
      </Typography>
    );

    const renderActions = (row: MailAutomationAccount) => (
      <Button size="small" variant="outlined" startIcon={<TuneIcon />} onClick={() => onConfigure(row)}>
        {t('support.mailAutomation.configure')}
      </Button>
    );

    return [
      {
        field: 'email',
        headerName: t('support.mailAutomation.colMailbox'),
        flex: 1.4,
        minWidth: 220,
        cellRenderer: renderMailbox,
      },
      {
        field: 'is_active',
        headerName: t('support.mailAutomation.colState'),
        width: 190,
        sortable: false,
        cellRenderer: renderState,
      },
      {
        field: 'ticket_type',
        headerName: t('support.mailAutomation.colOpens'),
        width: 170,
        valueGetter: (row) => t(QUEUE_LABEL[row.ticket_type]),
      },
      {
        field: 'sla_label',
        headerName: t('support.mailAutomation.colRepliesIn'),
        width: 130,
      },
      {
        field: 'ai_enabled',
        headerName: t('support.mailAutomation.colWriter'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderWriter,
      },
      {
        field: 'actions',
        headerName: '',
        width: 150,
        sortable: false,
        cellRenderer: renderActions,
      },
    ];
  }, [t, onConfigure]);

  return (
    <DuncitTable<MailAutomationAccount>
      tableId="support-mail-automation"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('support.mailAutomation.empty')}
      defaultSort={{ field: 'email', dir: 'asc' }}
      searchPlaceholder={t('support.mailAutomation.searchMailbox')}
      refetchRef={refetchRef}
    />
  );
}
