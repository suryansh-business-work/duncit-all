import { Card, CardContent, Divider, Skeleton, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { AD_PRICING_KEY_BY_POSITION, adPositionLabel, formatAdCost, type AdPosition, type AdPricing } from './ad-options';

interface EstimateCardProps {
  pricing?: AdPricing | null;
  loading: boolean;
  position: AdPosition;
  durationDays: number;
}

/** Live cost estimate: per-day price for the selected position × duration. */
export default function EstimateCard({ pricing, loading, position, durationDays }: Readonly<EstimateCardProps>) {
  if (loading || !pricing) {
    return (
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Estimated Cost
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
  const daysLabel = durationDays === 1 ? '1 day' : `${durationDays} days`;

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Estimated Cost
        </Typography>
        <Stack spacing={1.25}>
          <InfoRow variant="split" label={`${adPositionLabel(position)} · per day`} value={formatAdCost(perDay, symbol)} />
          <InfoRow variant="split" label="Duration" value={daysLabel} />
          <Divider />
          <InfoRow variant="split" bold label="Total estimate" value={formatAdCost(perDay * durationDays, symbol)} />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          The final cost is confirmed by the Marketing team when your request is approved.
        </Typography>
      </CardContent>
    </Card>
  );
}
