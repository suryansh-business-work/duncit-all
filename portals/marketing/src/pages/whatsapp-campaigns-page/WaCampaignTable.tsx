import { useMemo, type MutableRefObject } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
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
  canCancel,
  canDelete,
  labelFor,
} from './helpers';
import type { WaCampaignRow } from './queries';

interface Props {
  fetchRows: TableFetch<WaCampaignRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  /** Opens the campaign's detail view — who it reached and who it did not. */
  onOpen: (row: WaCampaignRow) => void;
  /** Calls off a scheduled send before its hour. */
  onCancel: (row: WaCampaignRow) => void;
  onDelete: (row: WaCampaignRow) => void;
  busy: boolean;
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

export default function WaCampaignTable({
  fetchRows,
  refetchRef,
  onOpen,
  onCancel,
  onDelete,
  busy,
}: Readonly<Props>) {
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
      dateColumn<WaCampaignRow>({
        field: 'scheduled_at',
        headerName: 'Scheduled for',
        hide: false,
        width: 160,
        format: DATE_TIME_FORMAT,
      }),
      dateColumn<WaCampaignRow>({
        field: 'sent_at',
        headerName: 'Sent at',
        hide: false,
        width: 160,
        format: DATE_TIME_FORMAT,
      }),
      dateColumn<WaCampaignRow>({ width: 160, format: DATE_TIME_FORMAT }),
      actionsColumn<WaCampaignRow>({
        width: 130,
        onDelete,
        delete: {
          title: 'Delete campaign',
          disabled: (row) => !canDelete(row.status),
          disabledTitle: 'Sending right now — wait for it to finish',
        },
        // Disabled rather than hidden: somebody looking for Cancel on a sent
        // campaign should be told why it is unavailable, not left hunting.
        renderExtra: (row) => {
          const cancellable = canCancel(row.status);
          const label = cancellable ? 'Cancel this send' : 'Only a scheduled send can be cancelled';
          return (
            <Tooltip title={label}>
              <span>
                <IconButton
                  size="small"
                  aria-label={label}
                  disabled={busy || !cancellable}
                  onClick={() => onCancel(row)}
                >
                  <EventBusyIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          );
        },
      }),
    ],
    [busy, onCancel, onDelete]
  );


  return (
    <DuncitTable<WaCampaignRow>
      tableId="wa-campaigns"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      emptyText="No WhatsApp campaigns yet."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search name or WhatsApp campaign"
      refetchRef={refetchRef}
    />
  );
}
