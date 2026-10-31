import { useQuery } from '@apollo/client/react';
import { Alert, Grid, Stack } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import { StatCard } from '@duncit/ui';
import { formatINR, parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import type { Translate } from '@duncit/shell';
import { POD_PROMO_SUMMARY, type PodPromoSummary } from '../queries';

interface Card {
  key: keyof PodPromoSummary;
  label: string;
}

const cards = (t: Translate): Card[] => [
  { key: 'planned', label: t('marketing.podPromo.cardPlanned') },
  { key: 'scheduled', label: t('marketing.podPromo.cardScheduled') },
  { key: 'published', label: t('marketing.podPromo.cardPublished') },
  { key: 'failed', label: t('marketing.podPromo.cardFailed') },
  { key: 'clicks', label: t('marketing.podPromo.cardClicks') },
  { key: 'bookings', label: t('marketing.podPromo.cardBookings') },
  { key: 'payments', label: t('marketing.podPromo.cardPayments') },
  { key: 'revenue', label: t('marketing.podPromo.cardRevenue') },
];

/** The headline numbers across every promotion; revenue in rupees, the rest as counts. */
export default function PromoSummaryCards() {
  const { t, locale } = useTranslation();
  const { data, loading, error } = useQuery<{ podPromoSummary: PodPromoSummary }>(POD_PROMO_SUMMARY, { fetchPolicy: 'cache-and-network' });
  const summary = data?.podPromoSummary;

  const valueOf = (key: keyof PodPromoSummary) => {
    if (!summary) return EM_DASH;
    return key === 'revenue' ? formatINR(summary.revenue) : summary[key].toLocaleString(locale);
  };

  return (
    <Stack spacing={1} data-tour="pod-promo-summary">
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      <Grid container spacing={2} data-testid="pod-promo-summary">
        {cards(t).map((card) => (
          <Grid key={card.key} size={{ xs: 6, sm: 4, md: 3 }}>
            <StatCard label={card.label} value={valueOf(card.key)} loading={loading && !summary} testId={`promo-card-${card.key}`} sx={{ height: '100%' }} />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
