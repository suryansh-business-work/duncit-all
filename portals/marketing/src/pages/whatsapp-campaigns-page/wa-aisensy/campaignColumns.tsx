import type { DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import CampaignRowActions from './CampaignRowActions';
import SendCountCell from './SendCountCell';
import type { WithSendCount } from './useWaSendCounts';
import { AISENSY_CAMPAIGN_STATUS_COLORS, statusKey, type CampaignRow } from './helpers';

/** A campaign row plus what it has actually sent — the two figures are real row
 * properties because this table pages in memory and sorts by reading one off
 * the row, never through a `valueGetter`. */
export type CampaignSendRow = CampaignRow & WithSendCount;

export const campaignRowId = (campaign: CampaignRow) => campaign.name;

/** A campaign AiSensy will accept a send for is Live — anything else is shown
 * as-is so the reason a send fails is visible before sending. */
const renderStatus = (campaign: CampaignRow) =>
  campaign.status ? (
    <StatusChip
      status={statusKey(campaign.status)}
      label={campaign.status}
      colorMap={AISENSY_CAMPAIGN_STATUS_COLORS}
    />
  ) : null;

interface ColumnDeps {
  t: (key: string) => string;
  /** Starts a real send against this campaign. */
  onSend: (campaign: CampaignRow) => void;
  /** Sends one test message on it, before pointing it at anybody. */
  onTest: (campaign: CampaignRow) => void;
  /** Opens the Logs tab narrowed to this campaign — what the Sent count does. */
  onOpenLogs: (campaigns: readonly string[]) => void;
}

/**
 * The campaign table's columns.
 *
 * Sorting is in memory (the catalogue arrives whole), so every `field` here is
 * a real row property — a synthetic one would sort by undefined.
 */
export function getCampaignColumns({
  t,
  onSend,
  onTest,
  onOpenLogs,
}: Readonly<ColumnDeps>): DuncitColumn<CampaignSendRow>[] {
  return [
    { field: 'name', headerName: t('marketing.common.campaign'), flex: 1, minWidth: 220 },
    { field: 'type', headerName: t('shell.common.type'), width: 150 },
    {
      field: 'status',
      headerName: t('shell.common.status'),
      width: 120,
      cellRenderer: renderStatus,
    },
    {
      field: 'template_name',
      headerName: t('marketing.whatsappCampaigns.template'),
      flex: 1,
      minWidth: 180,
    },
    {
      // Sorted on the SENT figure, which is what "which of these actually goes
      // out" asks — the attempts beside it are context, not the ranking.
      field: 'sent_count',
      headerName: t('marketingWhatsapp.sendCount.header'),
      width: 110,
      cellRenderer: (campaign) => <SendCountCell row={campaign} onOpenLogs={onOpenLogs} />,
    },
    {
      field: 'actions',
      headerName: t('shell.common.actions'),
      width: 110,
      sortable: false,
      cellRenderer: (campaign) => (
        <CampaignRowActions campaign={campaign} onSend={onSend} onTest={onTest} />
      ),
    },
  ];
}
