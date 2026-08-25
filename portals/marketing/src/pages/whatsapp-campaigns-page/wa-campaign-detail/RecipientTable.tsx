import { useMemo, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Box, Typography } from '@mui/material';
import { DuncitTable, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { WA_RECIPIENT_STATUS_COLORS, WA_RECIPIENT_STATUS_OPTIONS } from '../helpers';
import { WA_CAMPAIGN_RECIPIENTS, type WaCampaignRecipientRow } from '../queries';
import RecipientMessageDialog from './RecipientMessageDialog';
import { useTranslation } from '@duncit/app-settings';

const getRowId = (row: WaCampaignRecipientRow) => row.id;

const renderStatus = (row: WaCampaignRecipientRow) => (
  <StatusChip status={row.status} colorMap={WA_RECIPIENT_STATUS_COLORS} />
);

const renderPerson = (row: WaCampaignRecipientRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="div">
      {row.name || '—'}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="div">
      {row.destination}
    </Typography>
  </Box>
);

/** The template variables this person actually received, in order. */
const paramsText = (row: WaCampaignRecipientRow) =>
  row.template_params.length > 0 ? row.template_params.join(' · ') : '—';

interface Props {
  campaignId: string;
  /** The AiSensy campaign, so an opened row can draw that person's message. */
  campaignName: string;
}

/**
 * Everyone the send walked over, one row each. Filter by status to answer the
 * two questions a marketer actually has: who got it, and who did not and why.
 *
 * A row opens the message that person got — the values are resolved per person,
 * so the campaign's own preview cannot answer "what did it say to ME".
 */
export default function RecipientTable({ campaignId, campaignName }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [opened, setOpened] = useState<WaCampaignRecipientRow | null>(null);
  const fetchRows = useApolloTableFetch<WaCampaignRecipientRow>(
    client,
    WA_CAMPAIGN_RECIPIENTS,
    'waCampaignRecipients',
    { extraVariables: { campaign_id: campaignId } },
    [campaignId]
  );

  const columns = useMemo<DuncitColumn<WaCampaignRecipientRow>[]>(
    () => [
      {
        field: 'name',
        headerName: t('marketing.whatsappCampaigns.recipient'),
        flex: 1,
        minWidth: 190,
        cellRenderer: renderPerson,
        valueGetter: (row) => row.name,
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 120,
        filter: { type: 'select', options: WA_RECIPIENT_STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      {
        field: 'reason',
        headerName: t('marketing.whatsappCampaigns.whyNot'),
        sortable: false,
        flex: 1,
        minWidth: 220,
        valueGetter: (row) => row.reason || '—',
      },
      {
        field: 'template_params',
        headerName: t('marketing.whatsappCampaigns.paramsSent'),
        sortable: false,
        minWidth: 180,
        valueGetter: paramsText,
      },
      {
        field: 'submitted_message_id',
        headerName: t('marketing.whatsappCampaigns.aisensyMessageId'),
        sortable: false,
        hide: true,
        minWidth: 260,
        valueGetter: (row) => row.submitted_message_id || '—',
      },
      {
        field: 'attempts',
        headerName: t('marketing.whatsappCampaigns.tries'),
        sortable: false,
        hide: true,
        width: 90,
      },
      dateColumn<WaCampaignRecipientRow>({
        field: 'created_at',
        headerName: 'At',
        hide: false,
        width: 160,
        format: 'd MMM yyyy, HH:mm',
      }),
    ],
    []
  );

  return (
    <>
      <DuncitTable<WaCampaignRecipientRow>
        tableId="wa-campaign-recipients"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        onRowClick={setOpened}
        emptyText={t('marketing.whatsappCampaigns.noPerRecipientRecordForThis')}
        defaultSort={{ field: 'created_at', dir: 'asc' }}
        defaultPageSize={10}
        searchPlaceholder="Search name, number or reason"
      />

      <RecipientMessageDialog
        recipient={opened}
        campaignName={campaignName}
        onClose={() => setOpened(null)}
      />
    </>
  );
}
