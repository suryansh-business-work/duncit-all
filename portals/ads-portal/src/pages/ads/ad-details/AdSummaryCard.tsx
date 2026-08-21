import { Card, CardContent, Divider, Link, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { EM_DASH, formatDateCell } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
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

/** All the ad request details: schedule, targeting and cost. */
export default function AdSummaryCard({ ad }: Readonly<{ ad: AdRequestDetail }>) {
  const { t } = useTranslation();
  // `count` selects the .one / .other row, so a language whose plural rules
  // differ from English edits plain catalogue entries rather than this file.
  const daysLabel = t('ads.detail.durationDays', { count: ad.duration_days });
  const approvedCost =
    ad.approved_cost == null
      ? t('ads.detail.approvedCostPending')
      : formatAdCost(ad.approved_cost, ad.currency_symbol);

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          {t('ads.detail.title')}
        </Typography>
        <Stack spacing={1.25}>
          <InfoRow
            variant="inline"
            labelWidth={140}
            label={t('ads.detail.description')}
            value={ad.ad_description}
          />
          <InfoRow
            variant="inline"
            labelWidth={140}
            label={t('ads.detail.position')}
            value={adPositionLabel(ad.position)}
          />
          <InfoRow
            variant="inline"
            labelWidth={140}
            label={t('ads.detail.starts')}
            value={formatDateCell(ad.start_at, DATE_FORMAT)}
          />
          <InfoRow
            variant="inline"
            labelWidth={140}
            label={t('ads.detail.ends')}
            value={formatDateCell(ad.end_at, DATE_FORMAT)}
          />
          <InfoRow
            variant="inline"
            labelWidth={140}
            label={t('ads.detail.duration')}
            value={daysLabel}
          />
          <InfoRow
            variant="inline"
            labelWidth={140}
            label={t('ads.detail.redirectUrl')}
            value={redirectValue(ad)}
          />
          <InfoRow
            variant="inline"
            labelWidth={140}
            label={t('ads.detail.targetAudience')}
            value={ad.target_audience || EM_DASH}
          />
          <InfoRow
            variant="inline"
            labelWidth={140}
            label={t('ads.detail.submittedBy')}
            value={ad.submitted_by_name}
          />
          <InfoRow
            variant="inline"
            labelWidth={140}
            label={t('ads.detail.submittedOn')}
            value={formatDateCell(ad.created_at, DATE_TIME_FORMAT)}
          />
          <Divider />
          <InfoRow
            variant="split"
            label={t('ads.detail.estimatedCost')}
            value={formatAdCost(ad.estimated_cost, ad.currency_symbol)}
          />
          <InfoRow variant="split" bold label={t('ads.detail.approvedCost')} value={approvedCost} />
        </Stack>
      </CardContent>
    </Card>
  );
}
