import { useMemo, type MutableRefObject } from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  DuncitTable,
  actionsColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import {
  AUDIENCE_LABELS,
  AUDIENCE_OPTIONS,
  CAMPAIGN_STATUS_COLORS,
  CHANNEL_LABELS,
  CHANNEL_OPTIONS,
  STATUS_OPTIONS,
  canDelete,
  canSend,
  labelFor,
} from './helpers';
import type { MarketingCampaignRow } from './queries';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  fetchRows: TableFetch<MarketingCampaignRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  busy: boolean;
  onView: (row: MarketingCampaignRow) => void;
  onSend: (row: MarketingCampaignRow) => void;
  onDelete: (row: MarketingCampaignRow) => void;
}

const getCampaignRowId = (row: MarketingCampaignRow) => row.campaign_id;

const DATE_TIME_FORMAT = 'd MMM yyyy, HH:mm';

const renderCampaign = (row: MarketingCampaignRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="div" sx={{
      fontWeight: 700
    }}>
      {row.name}
    </Typography>
    <Typography variant="caption" component="div" sx={{
      color: "text.secondary"
    }}>
      {row.subject}
    </Typography>
    {row.error && (
      <Typography variant="caption" color="error" component="div">
        {row.error}
      </Typography>
    )}
  </Box>
);

const renderChannel = (row: MarketingCampaignRow) => (
  <Chip size="small" label={labelFor(CHANNEL_LABELS, row.channel)} />
);

const renderStatus = (row: MarketingCampaignRow) => (
  <StatusChip status={row.status} colorMap={CAMPAIGN_STATUS_COLORS} />
);

export default function CampaignTable({
  fetchRows,
  refetchRef,
  busy,
  onView,
  onSend,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<MarketingCampaignRow>[]>(
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
        field: 'channel',
        headerName: t('marketing.marketingCampaigns.channel'),
        minWidth: 170,
        filter: { type: 'select', options: CHANNEL_OPTIONS },
        cellRenderer: renderChannel,
        valueGetter: (row) => labelFor(CHANNEL_LABELS, row.channel),
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 130,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      {
        field: 'card',
        headerName: t('marketing.marketingCampaigns.card'),
        sortable: false,
        minWidth: 140,
        valueGetter: (row) => row.card?.title ?? '—',
      },
      dateColumn<MarketingCampaignRow>({
        field: 'scheduled_at',
        headerName: t('marketing.common.schedule'),
        hide: false,
        width: 160,
        format: DATE_TIME_FORMAT,
      }),
      dateColumn<MarketingCampaignRow>({
        field: 'sent_at',
        headerName: t('marketing.common.sent'),
        hide: false,
        width: 160,
        format: DATE_TIME_FORMAT,
      }),
      { field: 'recipient_count', headerName: t('marketing.common.recipients'), width: 120 },
      { field: 'open_count', headerName: t('marketing.marketingCampaigns.opened'), width: 110 },
      { field: 'click_count', headerName: t('marketing.common.clicked'), width: 110 },
      {
        field: 'audience',
        headerName: t('marketing.common.audience'),
        hide: true,
        minWidth: 180,
        filter: { type: 'select', options: AUDIENCE_OPTIONS },
        valueGetter: (row) => labelFor(AUDIENCE_LABELS, row.audience),
      },
      dateColumn<MarketingCampaignRow>({ width: 160, format: DATE_TIME_FORMAT }),
      actionsColumn<MarketingCampaignRow>({
        width: 150,
        onDelete,
        // Disabled rather than hidden: a marketer looking for Delete on a
        // sending campaign should be told why it is unavailable, not left
        // hunting for a button that is missing on some rows.
        delete: {
          title: t('marketing.common.deleteCampaign'),
          disabled: (row) => !canDelete(row.status),
          disabledTitle: 'Sending right now — wait for it to finish',
        },
        renderExtra: (row) => {
          // One label for the tooltip and the accessible name, so what a
          // screen reader announces is what the tooltip says.
          const sendLabel = canSend(row.status) ? 'Send campaign now' : 'Already sent';
          return (
            <>
              <Tooltip title={t('marketing.marketingCampaigns.viewCampaign')}>
                <IconButton size="small" aria-label={t('marketing.marketingCampaigns.viewCampaign')} onClick={() => onView(row)}>
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={sendLabel}>
                <span>
                  <IconButton
                    size="small"
                    aria-label={sendLabel}
                    disabled={busy || !canSend(row.status)}
                    onClick={() => onSend(row)}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          );
        },
      }),
    ],
    [busy, onView, onSend, onDelete],
  );

  return (
    <DuncitTable<MarketingCampaignRow>
      tableId="marketing-campaigns"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getCampaignRowId}
      onRowClick={onView}
      emptyText={t('marketing.marketingCampaigns.noCampaignsYetCreateOneTo')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search name or subject"
      refetchRef={refetchRef}
    />
  );
}
