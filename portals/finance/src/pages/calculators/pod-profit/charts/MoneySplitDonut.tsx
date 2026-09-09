import { useTheme } from '@mui/material/styles';
import { Doughnut } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { useTranslation } from '@duncit/app-settings';
import ChartCard from './ChartCard';
import { PARTY_COLORS, moneyTooltip } from './chartSetup';

interface Props {
  gst: number;
  venue: number;
  host: number;
  duncit: number;
}

/**
 * The collection, split four ways.
 *
 * These four ALWAYS add back to the total collection — that is the waterfall's
 * reconciliation invariant — which is exactly what makes a donut honest here.
 * Expenses are deliberately not a slice: they come out of a side's own money
 * afterwards, so adding them would make the ring sum to more than was collected.
 *
 * A negative host remainder (the venue's booked price exceeding the pool) is
 * clamped to zero for the ARC only: a donut cannot draw a negative slice, and
 * the results card beside it already states the shortfall in words.
 */
export default function MoneySplitDonut({ gst, venue, host, duncit }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();

  const slices = [
    { label: t('finance.calculators.gst'), value: gst, color: PARTY_COLORS.gst },
    { label: t('finance.calculators.venueReceives'), value: venue, color: PARTY_COLORS.venue },
    { label: t('finance.calculators.hostReceives'), value: host, color: PARTY_COLORS.host },
    { label: t('finance.calculators.duncitRevenue'), value: duncit, color: PARTY_COLORS.duncit },
  ];
  const hasData = slices.some((slice) => slice.value > 0);

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '58%',
    plugins: moneyTooltip(theme),
  };

  return (
    <ChartCard
      title={t('finance.calculators.chartMoneySplit')}
      hint={t('finance.calculators.chartMoneySplitHint')}
      hasData={hasData}
    >
      <Doughnut
        data={{
          labels: slices.map((slice) => slice.label),
          datasets: [
            {
              data: slices.map((slice) => Math.max(0, slice.value)),
              backgroundColor: slices.map((slice) => slice.color),
              borderColor: theme.palette.background.paper,
              borderWidth: 2,
            },
          ],
        }}
        options={options}
      />
    </ChartCard>
  );
}
