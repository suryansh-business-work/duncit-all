import { useMemo, type MutableRefObject } from 'react';
import { Box, Typography } from '@mui/material';
import {
  DuncitTable,
  actionsColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import {
  WA_AUDIENCE_LABELS,
  WA_AUDIENCE_OPTIONS,
  WA_STATUS_COLORS,
  WA_STATUS_OPTIONS,
  canDelete,
  labelFor,
} from './helpers';
import type { WaCampaignRow } from './queries';

interface Props {
  fetchRows: TableFetch<WaCampaignRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onDelete: (row: WaCampaignRow) => void;
}

const getRowId = (row: WaCampaignRow) => row.campaign_id;

const DATE_TIME_FORMAT = 'd MMM yyyy, HH:mm';

const renderCampaign = (row: WaCampaignRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="div">
      {row.name}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="div">
      {row.wa_campaign_name}
    </Typography>
    {row.error && (
      <Typography variant="caption" color="error" component="div">
        {row.error}
      </Typography>
    )}
  </Box>
);

const renderStatus = (row: WaCampaignRow) => (
  <StatusChip status={row.status} colorMap={WA_STATUS_COLORS} />
);

/** The first failure reason, so a partly-failed send explains itself in the
 * row rather than only in the server logs. */
const firstFailure = (row: WaCampaignRow) => row.failures[0]?.reason ?? '—';

export default function WaCampaignTable({ fetchRows, refetchRef, onDelete }: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<WaCampaignRow>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Campaign',
        flex: 1,
        minWidth: 220,
        cellRenderer: renderCampaign,
        valueGetter: (row) => row.name,
      },
      {
        field: 'audience',
        headerName: 'Audience',
        minWidth: 170,
        filter: { type: 'select', options: WA_AUDIENCE_OPTIONS },
        valueGetter: (row) => labelFor(WA_AUDIENCE_LABELS, row.audience),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        filter: { type: 'select', options: WA_STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      { field: 'recipient_count', headerName: 'Recipients', width: 120 },
      { field: 'sent_count', headerName: 'Sent', width: 100 },
      { field: 'failed_count', headerName: 'Failed', width: 100 },
      { field: 'skipped_count', headerName: 'Skipped', width: 110 },
      {
        field: 'failures',
        headerName: 'First failure',
        sortable: false,
        hide: true,
        minWidth: 220,
        valueGetter: firstFailure,
      },
      dateColumn<WaCampaignRow>({
        field: 'sent_at',
        headerName: 'Sent at',
        hide: false,
        width: 160,
        format: DATE_TIME_FORMAT,
      }),
      dateColumn<WaCampaignRow>({ width: 160, format: DATE_TIME_FORMAT }),
      actionsColumn<WaCampaignRow>({
        width: 90,
        onDelete,
        delete: {
          title: 'Delete campaign',
          disabled: (row) => !canDelete(row.status),
          disabledTitle: 'Sending right now — wait for it to finish',
        },
      }),
    ],
    [onDelete]
  );

  return (
    <DuncitTable<WaCampaignRow>
      tableId="wa-campaigns"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText="No WhatsApp campaigns yet."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search name or WhatsApp campaign"
      refetchRef={refetchRef}
    />
  );
}
