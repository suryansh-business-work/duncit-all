import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ChartData, ChartOptions } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
  SectionCard,
  categoryAxis,
  chartSeriesColor,
  chartTooltip,
  lineTrendDataset,
  lineTrendOptions,
  valueAxis,
} from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import type { GrowthOutputs } from '../../../lib/growth-calculator';
import { formatRupeesShort, formatTarget } from '../../../lib/growth-format';
import { cumulativeByMonth } from './chart-setup';

const CHART_HEIGHT = 280;

/**
 * Two charts, one unit each (never two y-axes): rupees accumulating over a
 * year, and people — the leads a funnel needs against the partners it signs.
 * The breakdown cards beside them carry the same figures as text.
 */
export default function GrowthCharts({ outputs }: Readonly<{ outputs: GrowthOutputs }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { totals } = outputs;

  const revenue = useMemo<ChartData<'line'>>(
    () => ({
      labels: Array.from({ length: 12 }, (_, i) => t('targets.growth.charts.month', { vars: { n: i + 1 } })),
      datasets: [
        { label: t('targets.growth.charts.gmv'), data: cumulativeByMonth(Number(totals.monthly_gmv)), ...lineTrendDataset(theme, 0, false) },
        {
          label: t('targets.growth.charts.earnings'),
          data: cumulativeByMonth(Number(totals.monthly_earnings)),
          ...lineTrendDataset(theme, 1, false),
        },
      ],
    }),
    [t, theme, totals.monthly_gmv, totals.monthly_earnings]
  );

  const revenueOptions = useMemo<ChartOptions<'line'>>(() => {
    const base = lineTrendOptions(theme, false);
    const rupees = (value: number) => formatRupeesShort(value.toFixed(2));
    return {
      ...base,
      plugins: {
        ...base.plugins,
        tooltip: { ...chartTooltip(theme), callbacks: { label: (item) => `${item.dataset.label ?? ''}: ${rupees(item.parsed.y ?? 0)}` } },
      },
      scales: { x: categoryAxis(theme, 6), y: valueAxis(theme, rupees) },
    };
  }, [theme]);

  const leads = useMemo<ChartData<'bar'>>(
    () => ({
      labels: [t('targets.growth.charts.hosts'), t('targets.growth.charts.venues')],
      datasets: [
        {
          label: t('targets.growth.charts.leadsNeeded'),
          data: [totals.host_leads, totals.venue_leads],
          backgroundColor: chartSeriesColor(theme, 0),
          borderRadius: 4,
          maxBarThickness: 48,
        },
        {
          label: t('targets.growth.charts.partnersSigned'),
          data: [totals.hosts, totals.venues],
          backgroundColor: chartSeriesColor(theme, 1),
          borderRadius: 4,
          maxBarThickness: 48,
        },
      ],
    }),
    [t, theme, totals.host_leads, totals.venue_leads, totals.hosts, totals.venues]
  );

  const leadsOptions = useMemo<ChartOptions<'bar'>>(() => {
    const base = lineTrendOptions(theme, false);
    return {
      ...base,
      plugins: {
        ...base.plugins,
        tooltip: {
          ...chartTooltip(theme),
          callbacks: { label: (item) => `${item.dataset.label ?? ''}: ${formatTarget(item.parsed.y ?? 0)}` },
        },
      },
      scales: { x: categoryAxis(theme), y: valueAxis(theme, formatTarget) },
    };
  }, [theme]);

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' } }}>
      <SectionCard title={t('targets.growth.charts.revenueTitle')} subtitle={t('targets.growth.charts.revenueSubtitle')}>
        <Box sx={{ height: CHART_HEIGHT }}>
          <Line data={revenue} options={revenueOptions} aria-label={t('targets.growth.charts.revenueAria')} role="img" />
        </Box>
      </SectionCard>
      <SectionCard title={t('targets.growth.charts.leadsTitle')} subtitle={t('targets.growth.charts.leadsSubtitle')}>
        <Box sx={{ height: CHART_HEIGHT }}>
          <Bar data={leads} options={leadsOptions} aria-label={t('targets.growth.charts.leadsAria')} role="img" />
        </Box>
      </SectionCard>
    </Box>
  );
}
