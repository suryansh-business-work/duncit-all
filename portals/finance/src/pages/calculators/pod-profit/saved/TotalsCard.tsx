import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import FunctionsIcon from '@mui/icons-material/Functions';
import { useTranslation } from '@duncit/app-settings';
import { formatRupees } from '../types';
import PodStat from './PodStat';
import type { PodTotals } from './types';

/**
 * Every pod in the calculation added up — the same four figures each accordion
 * header carries, plus the collection they were split out of.
 *
 * The pod count is pods MODELLED, not rows: a row standing for ten identical
 * pods contributes ten, which is what makes the projection worth having.
 */
export default function TotalsCard({ totals }: Readonly<{ totals: PodTotals }>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" sx={{ borderColor: 'primary.main' }}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
          <FunctionsIcon color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {t('finance.calculators.grandTotal')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('finance.calculators.allPodsCombined')}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {t('finance.calculators.podsInComparison')}: {totals.pods}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <PodStat
            label={t('finance.calculators.totalCollection')}
            value={formatRupees(totals.collection_total)}
            tone="default"
            size="lg"
          />
          <PodStat
            label={t('finance.calculators.duncitRevenue')}
            value={formatRupees(totals.duncit_revenue_total)}
            tone="primary"
            size="lg"
          />
          <PodStat
            label={t('finance.calculators.venueReceives')}
            value={formatRupees(totals.venue_receives)}
            tone="success"
            size="lg"
          />
          <PodStat
            label={t('finance.calculators.hostReceives')}
            value={formatRupees(totals.host_receives)}
            tone="success"
            size="lg"
          />
          <PodStat
            label={t('finance.calculators.gst')}
            value={formatRupees(totals.gst_amount)}
            tone="warning"
            size="lg"
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
