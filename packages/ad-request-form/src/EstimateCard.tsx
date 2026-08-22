import { Card, CardContent, Divider, Skeleton, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import {
  AD_PRICING_KEY_BY_POSITION,
  adPositionLabel,
  formatAdCost,
  type AdPosition,
  type AdPricing,
} from './ad-options';
import { useTranslation } from './i18n/useTranslation';

interface EstimateCardProps {
  pricing?: AdPricing | null;
  loading: boolean;
  position: AdPosition;
  durationDays: number;
}

/** Live cost estimate: per-day price for the selected position × duration. */
export default function EstimateCard({ pricing, loading, position, durationDays }: Readonly<EstimateCardProps>) {
  const { t } = useTranslation();
  if (loading || !pricing) {
    return (
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            {t('adRequest.estimate.title')}
          </Typography>
          <Skeleton height={28} />
          <Skeleton height={28} />
          <Skeleton height={36} />
        </CardContent>
      </Card>
    );
  }

  const perDay = pricing[AD_PRICING_KEY_BY_POSITION[position]];
  const symbol = pricing.currency_symbol;
  const daysLabel = t('adRequest.days', { count: durationDays });

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {t('adRequest.estimate.title')}
        </Typography>
        <Stack spacing={1.25}>
          <InfoRow
            variant="split"
            label={t('adRequest.estimate.perDay', {
              vars: { position: adPositionLabel(position, t) },
            })}
            value={formatAdCost(perDay, symbol)}
          />
          <InfoRow variant="split" label={t('adRequest.estimate.duration')} value={daysLabel} />
          <Divider />
          <InfoRow
            variant="split"
            bold
            label={t('adRequest.estimate.total')}
            value={formatAdCost(perDay * durationDays, symbol)}
          />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          {t('adRequest.estimate.footnote')}
        </Typography>
      </CardContent>
    </Card>
  );
}
