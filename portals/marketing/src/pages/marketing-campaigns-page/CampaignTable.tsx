import { useMemo, type MutableRefObject } from 'react';
import { Box, Button, Chip, Tooltip, Typography, type ChipProps } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { format } from 'date-fns';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { MarketingCampaignRow } from './queries';

interface Props {
  fetchRows: TableFetch<MarketingCampaignRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  sending: boolean;
  onSend: (campaignId: string) => void;
}

const getCampaignRowId = (row: MarketingCampaignRow) => row.campaign_id;

const STATUS_COLORS: Record<string, ChipProps['color']> = {
  SENT: 'success',
  FAILED: 'error',
  SCHEDULED: 'info',
  SENDING: 'warning',
};

const STATUS_OPTIONS = ['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED'].map((value) => ({
  value,
  label: value,
}));

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp Email Fallback',
};

const CHANNEL_OPTIONS = Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label }));

const AUDIENCE_LABELS: Record<string, string> = {
  ALL_USERS: 'All users',
  NEWSLETTER_SUBSCRIBERS: 'Newsletter subscribers',
};

const AUDIENCE_OPTIONS = Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label }));

const formatDate = (value?: string | null) =>
  value ? format(new Date(value), 'd MMM yyyy, HH:mm') : '—';

const renderCampaign = (row: MarketingCampaignRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="div">
      {row.name}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="div">
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
  <Chip size="small" label={CHANNEL_LABELS[row.channel] ?? row.channel} />
);

const renderStatus = (row: MarketingCampaignRow) => (
  <Chip size="small" color={STATUS_COLORS[row.status] ?? 'default'} label={row.status} />
);

export default function CampaignTable({
  fetchRows,
  refetchRef,
  sending,
  onSend,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<MarketingCampaignRow>[]>(() => {
    const renderActions = (row: MarketingCampaignRow) => (
      <Tooltip title="Send campaign now">
        <span>
          <Button
            size="small"
            startIcon={<SendIcon />}
            disabled={sending || row.status === 'SENT' || row.status === 'SENDING'}
            onClick={() => onSend(row.campaign_id)}
          >
            Send
          </Button>
        </span>
      </Tooltip>
    );
    return [
      {
        field: 'name',
        headerName: 'Campaign',
        flex: 1,
        minWidth: 220,
        cellRenderer: renderCampaign,
        valueGetter: (row) => row.name,
      },
      {
        field: 'channel',
        headerName: 'Channel',
        minWidth: 170,
        filter: { type: 'select', options: CHANNEL_OPTIONS },
        cellRenderer: renderChannel,
        valueGetter: (row) => CHANNEL_LABELS[row.channel] ?? row.channel,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      {
        field: 'card',
        headerName: 'Card',
        sortable: false,
        minWidth: 140,
        valueGetter: (row) => row.card?.title ?? '—',
      },
      {
        field: 'scheduled_at',
        headerName: 'Schedule',
        width: 160,
        filter: { type: 'date' },
        valueGetter: (row) => formatDate(row.scheduled_at),
      },
      {
        field: 'sent_at',
        headerName: 'Sent',
        width: 160,
        filter: { type: 'date' },
        valueGetter: (row) => formatDate(row.sent_at),
      },
      { field: 'recipient_count', headerName: 'Recipients', width: 120 },
      {
        field: 'audience',
        headerName: 'Audience',
        hide: true,
        minWidth: 180,
        filter: { type: 'select', options: AUDIENCE_OPTIONS },
        valueGetter: (row) => AUDIENCE_LABELS[row.audience] ?? row.audience,
      },
      {
        field: 'created_at',
        headerName: 'Created',
        hide: true,
        width: 160,
        filter: { type: 'date' },
        valueGetter: (row) => formatDate(row.created_at),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        width: 120,
        cellRenderer: renderActions,
      },
    ];
  }, [sending, onSend]);

  return (
    <DuncitTable<MarketingCampaignRow>
      tableId="marketing-campaigns"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getCampaignRowId}
      emptyText="No campaigns yet."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search name or subject"
      refetchRef={refetchRef}
    />
  );
}
