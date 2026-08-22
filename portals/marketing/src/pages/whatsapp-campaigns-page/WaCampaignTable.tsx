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
  WA_CATEGORY_OPTIONS,
  WA_STATUS_COLORS,
  WA_STATUS_OPTIONS,
  canCancel,
  canDelete,
  categoryLabel,
  labelFor,
  waMoney,
  waRate,
} from './helpers';
import type { WaCampaignRow } from './queries';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  fetchRows: TableFetch<WaCampaignRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  /** The symbol the rate card is kept in — costs are printed in it. */
  currency: string;
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

/** What this send has cost so far, with the rate it froze underneath — a total
 * with no rate beside it cannot be checked. */
const renderCost = (row: WaCampaignRow, currency: string) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="div">
      {waMoney(row.cost, currency)}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="div">
      {row.msg_rate > 0 ? `${waRate(row.msg_rate, currency)}/msg` : 'No rate'}
    </Typography>
  </Box>
);

export default function WaCampaignTable({
  fetchRows,
  refetchRef,
  currency,
  onOpen,
  onCancel,
  onDelete,
  busy,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<WaCampaignRow>[]>(
    () => [
      {
        field: 'name',
        headerName: t('marketing.common.campaign'),
        flex: 1,
        minWidth: 220,
        cellRenderer: renderCampaign,
        valueGetter: (row) => row.name,
      },
      {
        field: 'audience',
        headerName: t('marketing.common.audience'),
        minWidth: 170,
        filter: { type: 'select', options: WA_AUDIENCE_OPTIONS },
        valueGetter: (row) => labelFor(WA_AUDIENCE_LABELS, row.audience),
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 130,
        filter: { type: 'select', options: WA_STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      {
        field: 'template_category',
        headerName: t('marketing.whatsappCampaigns.category'),
        width: 140,
        filter: { type: 'select', options: WA_CATEGORY_OPTIONS },
        valueGetter: (row) => categoryLabel(row.template_category),
      },
      { field: 'recipient_count', headerName: t('marketing.common.recipients'), width: 120 },
      { field: 'sent_count', headerName: t('marketing.common.sent'), width: 100 },
      { field: 'failed_count', headerName: t('marketing.common.failed'), width: 100 },
      { field: 'skipped_count', headerName: t('marketing.whatsappCampaigns.skipped'), width: 110 },
      {
        // Derived from the frozen rate and the messages that went out, so the
        // server has nothing to sort on — the column says so by not offering it.
        field: 'cost',
        headerName: t('marketing.common.cost'),
        width: 130,
        sortable: false,
        cellRenderer: (row) => renderCost(row, currency),
      },
      dateColumn<WaCampaignRow>({
        field: 'scheduled_at',
        headerName: t('marketing.whatsappCampaigns.scheduledFor'),
        hide: false,
        width: 160,
        format: DATE_TIME_FORMAT,
      }),
      dateColumn<WaCampaignRow>({
        field: 'sent_at',
        headerName: t('marketing.whatsappCampaigns.sentAt'),
        hide: false,
        width: 160,
        format: DATE_TIME_FORMAT,
      }),
      dateColumn<WaCampaignRow>({ width: 160, format: DATE_TIME_FORMAT }),
      actionsColumn<WaCampaignRow>({
        width: 130,
        onDelete,
        delete: {
          title: t('marketing.common.deleteCampaign'),
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
    [busy, currency, onCancel, onDelete]
  );


  return (
    <DuncitTable<WaCampaignRow>
      tableId="wa-campaigns"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      emptyText="Nothing sent yet — start a send from the Campaigns tab."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search name or WhatsApp campaign"
      refetchRef={refetchRef}
    />
  );
}
