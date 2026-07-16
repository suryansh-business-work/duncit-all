import { Card, CardContent, Divider, Link, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { EM_DASH, formatDateCell } from '@duncit/table';
import { adPositionLabel, formatAdCost } from '../ad-options';
import type { AdRequestDetail } from '../queries';

const DATE_FORMAT = 'd MMM yyyy';
const DATE_TIME_FORMAT = 'd MMM yyyy, HH:mm';

function redirectValue(ad: AdRequestDetail) {
  if (!ad.redirect_url) return EM_DASH;
  return (
    <Link href={ad.redirect_url} target="_blank" rel="noopener noreferrer" sx={{ wordBreak: 'break-all' }}>
      {ad.redirect_url}
    </Link>
  );
}

function approvedCostValue(ad: AdRequestDetail) {
  if (ad.approved_cost == null) return 'Pending review';
  return formatAdCost(ad.approved_cost, ad.currency_symbol);
}

/** All the ad request details: schedule, targeting and cost. */
export default function AdSummaryCard({ ad }: Readonly<{ ad: AdRequestDetail }>) {
  const daysLabel = ad.duration_days === 1 ? '1 day' : `${ad.duration_days} days`;
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          Request Details
        </Typography>
        <Stack spacing={1.25}>
          <InfoRow variant="inline" labelWidth={140} label="Description" value={ad.ad_description} />
          <InfoRow
            variant="inline"
            labelWidth={140}
            label="Position"
            value={adPositionLabel(ad.position)}
          />
          <InfoRow
            variant="inline"
            labelWidth={140}
            label="Starts"
            value={formatDateCell(ad.start_at, DATE_FORMAT)}
          />
          <InfoRow
            variant="inline"
            labelWidth={140}
            label="Ends"
            value={formatDateCell(ad.end_at, DATE_FORMAT)}
          />
          <InfoRow variant="inline" labelWidth={140} label="Duration" value={daysLabel} />
          <InfoRow variant="inline" labelWidth={140} label="Redirect URL" value={redirectValue(ad)} />
          <InfoRow
            variant="inline"
            labelWidth={140}
            label="Target audience"
            value={ad.target_audience || EM_DASH}
          />
          <InfoRow variant="inline" labelWidth={140} label="Submitted by" value={ad.submitted_by_name} />
          <InfoRow
            variant="inline"
            labelWidth={140}
            label="Submitted on"
            value={formatDateCell(ad.created_at, DATE_TIME_FORMAT)}
          />
          <Divider />
          <InfoRow
            variant="split"
            label="Estimated cost"
            value={formatAdCost(ad.estimated_cost, ad.currency_symbol)}
          />
          <InfoRow variant="split" bold label="Approved cost" value={approvedCostValue(ad)} />
        </Stack>
      </CardContent>
    </Card>
  );
}
