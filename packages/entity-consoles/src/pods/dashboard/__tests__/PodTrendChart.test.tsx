import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { format, parseISO } from 'date-fns';
import PodTrendChart from '../PodTrendChart';

// react-chartjs-2's Bar throws under jsdom (chart.js's resize/layout code reads
// canvas internals jsdom does not implement). Stub only the rendering
// primitive so the REAL data transformation in PodTrendChart (the day labels
// and per-day counts built from `trend`) still runs and can be asserted on,
// without ever touching chart.js's canvas path.
vi.mock('react-chartjs-2', () => ({
  Bar: (props: { data: unknown; options: unknown }) => (
    <div data-testid="chart">
      <pre data-testid="chart-props">{JSON.stringify({ data: props.data, options: props.options })}</pre>
    </div>
  ),
}));

interface ChartProps {
  data: { labels: string[]; datasets: [{ label: string; data: number[]; backgroundColor: string }] };
  options: {
    plugins: { legend: { display: boolean } };
    scales: { x: { ticks: { maxTicksLimit: number; autoSkip: boolean } }; y: { beginAtZero: boolean } };
  };
}

const chartProps = (): ChartProps => JSON.parse(screen.getByTestId('chart-props').textContent ?? '{}');

// Noon UTC so `format`/`parseISO` land on the same calendar day in every
// timezone this suite might run under.
const day = (d: string) => `${d}T12:00:00.000Z`;
const label = (d: string) => format(parseISO(day(d)), 'd MMM');

describe('PodTrendChart', () => {
  it('renders one bar per day with a "d MMM" label and the raw count as data', () => {
    render(
      <PodTrendChart
        trend={[
          { date: day('2026-03-04'), count: 5 },
          { date: day('2026-03-05'), count: 0 },
        ]}
        loading={false}
      />,
    );
    const { data } = chartProps();
    expect(data.labels).toEqual([label('2026-03-04'), label('2026-03-05')]);
    expect(data.datasets[0].data).toEqual([5, 0]);
    expect(data.datasets[0].backgroundColor).toBe('#7c3aed');
  });

  it('labels the dataset with the podsCreated translation key, used again as the card title', () => {
    render(<PodTrendChart trend={[{ date: day('2026-03-04'), count: 1 }]} loading={false} />);
    const { data } = chartProps();
    expect(data.datasets[0].label).toBe('Pods created');
    expect(screen.getAllByText('Pods created').length).toBeGreaterThan(0);
  });

  it('shows a loading placeholder instead of the chart while loading with no data yet', () => {
    render(<PodTrendChart trend={[]} loading />);
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
    expect(screen.getByText('Loading pod activity…')).toBeInTheDocument();
  });

  it('shows a no-data placeholder once loading finishes with every day at zero', () => {
    render(<PodTrendChart trend={[{ date: day('2026-03-04'), count: 0 }]} loading={false} />);
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
    expect(screen.getByText('No pods were created in this period.')).toBeInTheDocument();
  });

  it('shows a no-data placeholder for an empty trend that has finished loading', () => {
    render(<PodTrendChart trend={[]} loading={false} />);
    expect(screen.getByText('No pods were created in this period.')).toBeInTheDocument();
  });

  it('renders the chart once at least one day has a count above zero, including zero-count days', () => {
    render(
      <PodTrendChart
        trend={[
          { date: day('2026-03-04'), count: 0 },
          { date: day('2026-03-05'), count: 2 },
        ]}
        loading={false}
      />,
    );
    expect(screen.getByTestId('chart')).toBeInTheDocument();
    const { data } = chartProps();
    // Both days stay in the chart — a quiet day is still a bar, not filtered out.
    expect(data.labels).toHaveLength(2);
    expect(data.datasets[0].data).toEqual([0, 2]);
  });

  it('sets the axis/tooltip options that keep a year of daily bars readable', () => {
    render(<PodTrendChart trend={[{ date: day('2026-03-04'), count: 1 }]} loading={false} />);
    const { options } = chartProps();
    expect(options.plugins.legend.display).toBe(false);
    expect(options.scales.x.ticks.maxTicksLimit).toBe(12);
    expect(options.scales.x.ticks.autoSkip).toBe(true);
    expect(options.scales.y.beginAtZero).toBe(true);
  });
});
