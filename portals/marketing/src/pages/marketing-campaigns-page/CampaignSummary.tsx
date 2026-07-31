import { Box } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import DetailField from './DetailField';
import { AUDIENCE_LABELS, CHANNEL_LABELS, labelFor, listNameFor } from './helpers';
import type { CampaignAudienceList } from './marketing-campaign-form';
import type { MarketingCampaignDetail } from './queries';

interface Props {
  campaign: MarketingCampaignDetail;
  audienceLists: CampaignAudienceList[];
  formatDateTime: (value: Date | string) => string;
}

const when = (value: string | null | undefined, format: Props['formatDateTime']) =>
  value ? format(value) : EM_DASH;

/** The facts about a campaign, minus the email body. */
export default function CampaignSummary({
  campaign,
  audienceLists,
  formatDateTime,
}: Readonly<Props>) {
  const listName = listNameFor(campaign.audience_list_id, audienceLists);
  const audience = labelFor(AUDIENCE_LABELS, campaign.audience);

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
      }}
    >
      <DetailField label="Campaign ID" value={campaign.campaign_id} />
      <DetailField label="Channel" value={labelFor(CHANNEL_LABELS, campaign.channel)} />
      <DetailField label="Audience" value={listName ? `${audience} · ${listName}` : audience} />
      <DetailField label="Recipients" value={String(campaign.recipient_count)} />
      <DetailField label="Card" value={campaign.card?.title ?? EM_DASH} />
      <DetailField label="Created" value={when(campaign.created_at, formatDateTime)} />
      <DetailField label="Scheduled" value={when(campaign.scheduled_at, formatDateTime)} />
      <DetailField label="Sent" value={when(campaign.sent_at, formatDateTime)} />
    </Box>
  );
}
