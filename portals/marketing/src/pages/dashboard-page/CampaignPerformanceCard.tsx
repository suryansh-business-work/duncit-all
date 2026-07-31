import { Box, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import type { DashboardRecentCampaign } from './queries';

interface Props {
  campaigns: DashboardRecentCampaign[];
  formatDate: (value: Date | string) => string;
  onOpen: () => void;
}

/**
 * Recent sends, measured by open rate.
 *
 * Open rate rather than raw opens on purpose: campaigns have wildly different
 * audience sizes, so raw counts rank by who you sent to, not by what landed.
 * The recipient count sits alongside so a 100% rate on an audience of three
 * cannot be mistaken for a triumph.
 */
export default function CampaignPerformanceCard({
  campaigns,
  formatDate,
  onOpen,
}: Readonly<Props>) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Recent campaigns
          </Typography>
          <Typography
            variant="caption"
            color="primary.main"
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onOpen();
            }}
            sx={{ cursor: 'pointer', fontWeight: 700 }}
          >
            View all
          </Typography>
        </Stack>

        {campaigns.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Nothing has been sent yet.
          </Typography>
        )}

        <Stack spacing={1.5}>
          {campaigns.map((campaign) => (
            <Box key={campaign.campaign_id} data-testid="recent-campaign">
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="body2" fontWeight={600} noWrap sx={{ minWidth: 0 }}>
                  {campaign.name}
                </Typography>
                <Typography variant="body2" fontWeight={700} flexShrink={0}>
                  {`${campaign.open_rate}%`}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                // A rate can exceed 100 if a recipient opens on two devices;
                // the bar caps so it never overflows its track.
                value={Math.min(100, campaign.open_rate)}
                sx={{ height: 6, borderRadius: 3, my: 0.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                {`${campaign.open_count.toLocaleString()} of ${campaign.recipient_count.toLocaleString()} opened · ${campaign.click_count.toLocaleString()} clicked · ${
                  campaign.sent_at ? formatDate(campaign.sent_at) : EM_DASH
                }`}
              </Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
