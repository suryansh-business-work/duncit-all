import { useTheme } from '@mui/material/styles';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { useTranslation } from '@duncit/app-settings';
import ChartCard from './ChartCard';
import { PARTY_COLORS, moneyScales, moneyTooltip } from './chartSetup';
import type { PodRow } from '../saved/types';

interface Props {
  rows: readonly PodRow[];
}

/**
 * Every pod in the comparison, side by side.
 *
 * Reads the SCALED figures, like the accordion headers and the grand total do:
 * a row standing for ten pods is worth ten here too, or the bars would not add
 * up to the total printed underneath them.
 *
 * Stacked, because these four are shares of one collection — the full column
 * height is what that pod brings in, and the bands are where it goes.
 */
export default function PodComparisonBar({ rows }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();

  const bands = [
    {
      label: t('finance.calculators.venueReceives'),
      color: PARTY_COLORS.venue,
      value: (row: PodRow) => row.results.scaled.venue_receives,
    },
    {
      label: t('finance.calculators.hostReceives'),
      color: PARTY_COLORS.host,
      value: (row: PodRow) => row.results.scaled.host_receives,
    },
    {
      label: t('finance.calculators.duncitRevenue'),
      color: PARTY_COLORS.duncit,
      value: (row: PodRow) => row.results.scaled.duncit_revenue_total,
    },
    {
      label: t('finance.calculators.gst'),
      color: PARTY_COLORS.gst,
      value: (row: PodRow) => row.results.scaled.gst_amount,
    },
  ];
  const hasData = rows.some((row) => row.results.scaled.collection_total > 0);

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: moneyTooltip(theme),
    scales: moneyScales(theme, true),
  };

  return (
    <ChartCard
      title={t('finance.calculators.chartPodComparison')}
      hint={t('finance.calculators.chartPodComparisonHint')}
      hasData={hasData}
      height={300}
    >
      <Bar
        data={{
          labels: rows.map((row) => row.name),
          datasets: bands.map((band) => ({
            label: band.label,
            data: rows.map(band.value),
            backgroundColor: band.color,
            borderRadius: 4,
            maxBarThickness: 46,
          })),
        }}
        options={options}
      />
    </ChartCard>
  );
}
