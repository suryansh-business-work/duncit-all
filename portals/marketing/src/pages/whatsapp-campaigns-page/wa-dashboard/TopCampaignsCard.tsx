import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { StatusChip } from '@duncit/ui';
import { WA_STATUS_COLORS, categoryLabel, waMoney } from '../helpers';
import type { WaDashboardCampaign } from '../queries';

/** One send, as a line. Hoisted so it isn't redefined each render (S6478). */
function CampaignLine({
  campaign,
  currency,
  when,
}: Readonly<{ campaign: WaDashboardCampaign; currency: string; when: string }>) {
  return (
    <Stack direction="row" spacing={1} sx={{
      alignItems: "center"
    }}>
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{
          fontWeight: 700
        }}>
          {campaign.name}
        </Typography>
        <Typography variant="caption" noWrap sx={{
          color: "text.secondary"
        }}>
          {`${categoryLabel(campaign.template_category)} · ${campaign.messages.toLocaleString()} sent · ${when}`}
        </Typography>
      </Stack>
      <StatusChip status={campaign.status} colorMap={WA_STATUS_COLORS} />
      <Typography variant="body2" sx={{
        fontWeight: 800
      }}>
        {waMoney(campaign.cost, currency)}
      </Typography>
    </Stack>
  );
}

/**
 * The sends worth looking at first — the five that cost the most. Not the most
 * recent: a dashboard exists to point at the money, and the newest send is
 * already the top row of the Logs.
 */
export default function TopCampaignsCard({
  rows,
  currency,
}: Readonly<{ rows: WaDashboardCampaign[]; currency: string }>) {
  const { formatDateTime } = useDateFormat();

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            mb: 1.5
          }}>
          Costliest sends
        </Typography>
        {rows.length === 0 && (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Nothing sent in this window.
          </Typography>
        )}
        <Stack spacing={1.5}>
          {rows.map((campaign) => (
            <CampaignLine
              key={campaign.campaign_id}
              campaign={campaign}
              currency={currency}
              when={campaign.sent_at ? formatDateTime(campaign.sent_at) : 'not sent yet'}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
