import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client';
import { Tooltip, Typography } from '@mui/material';
import { DuncitTable, EM_DASH, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { WHATSAPP_MESSAGE_LOGS, type WaMessageLogRow } from '../queries';

/** The four states the server leaves an attempt in, as it writes them. */
const AUTO_LOG_STATUSES = ['SENDING', 'SENT', 'SKIPPED', 'FAILED'] as const;

/** SKIPPED stays grey: nobody was billed and nothing went wrong. */
const AUTO_LOG_STATUS_COLORS: StatusColorMap = {
  SENT: 'success',
  SENDING: 'warning',
  SKIPPED: 'default',
  FAILED: 'error',
};

const getRowId = (row: WaMessageLogRow) => row.id;

const renderStatus = (row: WaMessageLogRow) => (
  <StatusChip status={row.status} colorMap={AUTO_LOG_STATUS_COLORS} />
);

/**
 * This column is what the view is for: it answers "why didn't this person get
 * it". Blank on a send that went out, and the whole answer on anything else,
 * so it is given room and wraps rather than being cut off.
 */
const renderReason = (row: WaMessageLogRow) => {
  if (!row.reason) {
    return (
      <Typography variant="body2" color="text.secondary">
        {EM_DASH}
      </Typography>
    );
  }
  return (
    <Tooltip title={row.reason}>
      <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.35 }}>
        {row.reason}
      </Typography>
    </Tooltip>
  );
};

const renderScenario = (row: WaMessageLogRow) => (
  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }} noWrap>
    {row.event_key}
  </Typography>
);

/**
 * The platform's own sends, newest first — the answer to "the switch is on but
 * they got nothing". Column headers and status labels reuse adminWhatsapp.* —
 * the whatsapp bundle serves both portals, and two copies of "Sent to" is the
 * drift rule 40 stops.
 */
export default function WaAutoLogsTable() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const client = useApolloClient();

  const fetchRows = useApolloTableFetch<WaMessageLogRow>(
    client,
    WHATSAPP_MESSAGE_LOGS,
    'whatsappMessageLogs'
  );

  const columns = useMemo<DuncitColumn<WaMessageLogRow>[]>(() => {
    const statusLabels: Record<string, string> = {
      SENDING: t('adminWhatsapp.statusSending'),
      SENT: t('adminWhatsapp.statusSent'),
      SKIPPED: t('adminWhatsapp.statusSkipped'),
      FAILED: t('adminWhatsapp.statusFailed'),
    };
    const statusOptions = AUTO_LOG_STATUSES.map((status) => ({
      value: status,
      label: statusLabels[status] ?? status,
    }));
    return [
      {
        field: 'created_at',
        headerName: t('adminWhatsapp.logColWhen'),
        filter: { type: 'date' },
        width: 175,
        valueGetter: (row) => (row.created_at ? formatDateTime(row.created_at) : EM_DASH),
      },
      {
        field: 'event_key',
        headerName: t('adminWhatsapp.logColScenario'),
        flex: 1,
        minWidth: 210,
        cellRenderer: renderScenario,
      },
      {
        field: 'campaign',
        headerName: t('adminWhatsapp.logColCampaign'),
        sortable: false,
        flex: 1,
        minWidth: 180,
        valueGetter: (row) => row.campaign || EM_DASH,
      },
      {
        field: 'destination',
        headerName: t('adminWhatsapp.logColDestination'),
        width: 150,
        valueGetter: (row) => row.destination || EM_DASH,
      },
      {
        field: 'status',
        headerName: t('adminWhatsapp.logColStatus'),
        filter: { type: 'select', options: statusOptions },
        width: 120,
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      {
        field: 'reason',
        headerName: t('adminWhatsapp.logColReason'),
        sortable: false,
        flex: 1.4,
        minWidth: 280,
        cellRenderer: renderReason,
        valueGetter: (row) => row.reason || EM_DASH,
      },
    ];
  }, [t, formatDateTime]);

  return (
    <DuncitTable<WaMessageLogRow>
      tableId="marketing-wa-auto-logs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('marketingWhatsapp.autoLogs.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('marketingWhatsapp.autoLogs.search')}
    />
  );
}
