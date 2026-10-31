import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { formatINR } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import type { Translate } from '@duncit/shell';
import type { PodPromoFigures } from '../queries';

interface Step {
  key: string;
  label: string;
  value: number;
}

/** Click to payment, each step measured against the clicks so the bars read as survival. */
export const funnelSteps = (figures: PodPromoFigures, t: Translate): Step[] => [
  { key: 'clicks', label: t('marketing.podPromo.figClicks'), value: figures.clicks },
  { key: 'signups', label: t('marketing.podPromo.figSignups'), value: figures.signups },
  { key: 'bookings', label: t('marketing.podPromo.figBookings'), value: figures.bookings },
  { key: 'payments', label: t('marketing.podPromo.figPayments'), value: figures.payments },
];

const share = (value: number, of: number) => (of === 0 ? 0 : Math.min(100, Math.round((value / of) * 100)));

function Extra({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography variant="subtitle1" component="div">
        {value}
      </Typography>
    </Box>
  );
}

/** What one promotion brought in: the funnel, then revenue, visitors and the post's reactions. */
export default function PromoFigures({ figures }: Readonly<{ figures: PodPromoFigures }>) {
  const { t, locale } = useTranslation();
  const steps = funnelSteps(figures, t);
  const n = (value: number) => value.toLocaleString(locale);

  return (
    <Stack spacing={1.5} data-testid="promo-figures">
      <Typography variant="subtitle2" component="h3">
        {t('marketing.podPromo.figuresTitle')}
      </Typography>
      {steps.map((step) => (
        <Box key={step.key} data-testid={`promo-step-${step.key}`}>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography variant="body2">{step.label}</Typography>
            <Typography variant="body2">{n(step.value)}</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={share(step.value, figures.clicks)} aria-label={step.label} />
        </Box>
      ))}
      <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Extra label={t('marketing.podPromo.figRevenue')} value={formatINR(figures.revenue)} />
        <Extra label={t('marketing.podPromo.figVisitors')} value={n(figures.unique_visitors)} />
        <Extra label={t('marketing.podPromo.figPaidBookings')} value={n(figures.paid_bookings)} />
        <Extra label={t('marketing.podPromo.figLikes')} value={n(figures.likes)} />
        <Extra label={t('marketing.podPromo.figComments')} value={n(figures.comments)} />
      </Stack>
    </Stack>
  );
}
