import { Box } from '@mui/material';
import TimeSeriesChart, { type ChartSeries } from './TimeSeriesChart';

/** One chart of a grid: one unit, one axis, at most three series. */
export interface TimeSeriesChartSpec {
  id: string;
  title: string;
  subtitle?: string;
  series: readonly ChartSeries[];
  format: (value: number) => string;
}

interface Props {
  charts: readonly TimeSeriesChartSpec[];
  /** Shared by every chart — one per point on the timeline. */
  labels: string[];
  emptyText: string;
  testId?: string;
}

/**
 * Time-series charts two to a row on a wide screen, one on a phone. A stress
 * run's timeline and Tech's server history (which borrows this) share it.
 */
export default function TimeSeriesChartGrid({ charts, labels, emptyText, testId }: Readonly<Props>) {
  return (
    <Box data-testid={testId} sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
      {charts.map((chart) => (
        <TimeSeriesChart
          key={chart.id}
          title={chart.title}
          subtitle={chart.subtitle}
          labels={labels}
          series={chart.series}
          format={chart.format}
          emptyText={emptyText}
        />
      ))}
    </Box>
  );
}
