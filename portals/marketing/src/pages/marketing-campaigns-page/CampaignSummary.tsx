import { Box } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import DetailField from './DetailField';
import { AUDIENCE_LABELS, CHANNEL_LABELS, labelFor, listNameFor } from './helpers';
import type { CampaignAudienceList } from './marketing-campaign-form';
import type { MarketingCampaignDetail } from './queries';
import { useTranslation } from '@duncit/app-settings';

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
  const { t } = useTranslation();
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
      <DetailField label={t('marketing.marketingCampaigns.campaignId')} value={campaign.campaign_id} />
      <DetailField label={t('marketing.marketingCampaigns.channel')} value={labelFor(CHANNEL_LABELS, campaign.channel)} />
      <DetailField label={t('marketing.common.audience')} value={listName ? `${audience} · ${listName}` : audience} />
      <DetailField label={t('marketing.common.recipients')} value={String(campaign.recipient_count)} />
      <DetailField label={t('marketing.marketingCampaigns.card')} value={campaign.card?.title ?? EM_DASH} />
      <DetailField label={t('shell.common.created')} value={when(campaign.created_at, formatDateTime)} />
      <DetailField label={t('marketing.marketingCampaigns.scheduled')} value={when(campaign.scheduled_at, formatDateTime)} />
      <DetailField label={t('marketing.common.sent')} value={when(campaign.sent_at, formatDateTime)} />
    </Box>
  );
}
