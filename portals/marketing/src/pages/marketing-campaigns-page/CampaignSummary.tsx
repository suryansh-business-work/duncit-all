import { Box, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import { AUDIENCE_LABELS, CHANNEL_LABELS, labelFor, listNameFor } from './helpers';
import type { CampaignAudienceList } from './marketing-campaign-form';
import type { MarketingCampaignDetail } from './queries';

interface Props {
  campaign: MarketingCampaignDetail;
  audienceLists: CampaignAudienceList[];
  formatDateTime: (value: Date | string) => string;
}

interface FieldProps {
  label: string;
  value: string;
}

function Field({ label, value }: Readonly<FieldProps>) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} component="div">
        {value}
      </Typography>
    </Box>
  );
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
      <Field label="Campaign ID" value={campaign.campaign_id} />
      <Field label="Channel" value={labelFor(CHANNEL_LABELS, campaign.channel)} />
      <Field label="Audience" value={listName ? `${audience} · ${listName}` : audience} />
      <Field label="Recipients" value={String(campaign.recipient_count)} />
      <Field label="Card" value={campaign.card?.title ?? EM_DASH} />
      <Field label="Created" value={when(campaign.created_at, formatDateTime)} />
      <Field label="Scheduled" value={when(campaign.scheduled_at, formatDateTime)} />
      <Field label="Sent" value={when(campaign.sent_at, formatDateTime)} />
    </Box>
  );
}
