import { Tooltip, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { whatsappCategoryCopy } from '@duncit/app-settings';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import { LOG_STATUS_COLORS } from './helpers';
import type { WaMessageLogRow } from './queries';

/** The four states a send attempt can be left in, as the server writes them. */
export const LOG_STATUSES = ['SENDING', 'SENT', 'SKIPPED', 'FAILED'] as const;

const renderStatus = (row: WaMessageLogRow) => (
  <StatusChip status={row.status} colorMap={LOG_STATUS_COLORS} />
);

/**
 * This column is what the tab is for: it answers "why didn't this person get
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

interface ColumnDeps {
  t: (key: string) => string;
  formatDateTime: (value: string) => string;
  /** Localized labels for the status filter, keyed by the server's value. */
  statusLabels: Readonly<Record<string, string>>;
}

export function getLogColumns({
  t,
  formatDateTime,
  statusLabels,
}: Readonly<ColumnDeps>): DuncitColumn<WaMessageLogRow>[] {
  const statusOptions = LOG_STATUSES.map((status) => ({
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
      minWidth: 260,
      cellRenderer: renderReason,
      valueGetter: (row) => row.reason || EM_DASH,
    },
    {
      field: 'event_key',
      headerName: t('adminWhatsapp.logColScenario'),
      flex: 1,
      minWidth: 210,
      cellRenderer: renderScenario,
    },
    {
      field: 'destination',
      headerName: t('adminWhatsapp.logColDestination'),
      width: 150,
      valueGetter: (row) => row.destination || EM_DASH,
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
      field: 'audience',
      headerName: t('adminWhatsapp.logColAudience'),
      sortable: false,
      width: 120,
    },
    {
      field: 'category',
      headerName: t('adminWhatsapp.logColCategory'),
      sortable: false,
      width: 150,
      valueGetter: (row) => whatsappCategoryCopy(t, row.category).label,
    },
    {
      field: 'msg_rate',
      headerName: t('adminWhatsapp.logColRate'),
      sortable: false,
      width: 110,
      valueGetter: (row) => formatMoney(row.msg_rate, { decimals: 2, grouping: false }),
    },
    {
      field: 'duration_ms',
      headerName: t('adminWhatsapp.logColDuration'),
      sortable: false,
      width: 100,
      valueGetter: (row) => `${row.duration_ms} ms`,
    },
  ];
}
