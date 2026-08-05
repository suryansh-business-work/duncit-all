import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import type { AisensyCampaign } from '../queries';
import AisensySection from './AisensySection';
import { useAisensyCatalogue } from './useAisensyCatalogue';

/** A campaign AiSensy will actually accept a send for is Live — anything else
 * is shown as-is so the reason a send fails is visible before sending. */
const statusColor = (status: string) =>
  status.toUpperCase() === 'LIVE' ? 'success' : 'default';

/** One campaign row. Hoisted so it isn't redefined each render (S6478). */
function CampaignRow({ campaign }: Readonly<{ campaign: AisensyCampaign }>) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ py: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography fontWeight={800} sx={{ flex: 1, minWidth: 0 }} noWrap>
            {campaign.name}
          </Typography>
          {campaign.type && <Chip size="small" label={campaign.type} />}
          {campaign.status && (
            <Chip size="small" color={statusColor(campaign.status)} label={campaign.status} />
          )}
        </Stack>
        {campaign.template_name && (
          <Typography variant="caption" color="text.secondary">
            Template: {campaign.template_name}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

/** The API campaigns AiSensy has for this project, read live. */
export default function AisensyCampaigns() {
  const { configured, campaigns, loading, error } = useAisensyCatalogue();

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Campaigns as AiSensy has them right now. A send only works against one whose status is
        Live.
      </Typography>
      <AisensySection
        configured={configured}
        loading={loading}
        error={error}
        count={campaigns.length}
        emptyText="AiSensy returned no campaigns for this project."
      >
        <Stack spacing={1}>
          {campaigns.map((campaign) => (
            <CampaignRow key={campaign.name} campaign={campaign} />
          ))}
        </Stack>
      </AisensySection>
    </Stack>
  );
}
