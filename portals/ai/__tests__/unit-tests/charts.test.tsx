import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import RankBars from '../../src/components/charts/RankBars';
import TrendChart from '../../src/components/charts/TrendChart';
import { rankBy, TOP_N } from '../../src/components/charts/ranking';
import { millis, percent, rankSummary, trendSummary } from '../../src/components/charts/summaries';
import { renderWithProviders } from '../testkit';

/**
 * react-chartjs-2 draws on a canvas jsdom cannot paint, so the stub keeps the
 * last props it was handed: the REAL datasets and options the components build
 * are then asserted on, and the tooltip callbacks invoked directly.
 */
interface ChartProps {
  data: { labels: string[]; datasets: Array<Record<string, unknown> & { label: string; data: number[] }> };
  options: {
    indexAxis?: string;
    plugins: {
      legend: { display: boolean };
      tooltip: { callbacks: { label: (item: unknown) => string } };
    };
    scales: { x: { stacked: boolean }; y: { stacked: boolean } };
  };
  'aria-label': string;
}
const drawn = vi.hoisted(() => ({ props: null as unknown, kind: '' }));
vi.mock('react-chartjs-2', () => {
  const stub = (kind: string) => (props: Record<string, unknown>) => {
    drawn.props = props;
    drawn.kind = kind;
    return <canvas role="img" aria-label={String(props['aria-label'])} />;
  };
  return { Bar: stub('bar'), Line: stub('line') };
});
const last = () => drawn.props as ChartProps;

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  `${key}${options?.vars ? ` ${JSON.stringify(options.vars)}` : ''}`;
const usdish = (value: number) => `$${value}`;

describe('RankBars', () => {
  it('draws one unstacked horizontal series with no legend, named for screen readers', () => {
    renderWithProviders(
      <RankBars labels={['Pods', 'CRM']} series={[{ label: 'Cost', data: [2, 1] }]} format={usdish} summary="Cost by area" emptyText="none" />
    );

    expect(screen.getByRole('img', { name: 'Cost by area' })).toBeInTheDocument();
    const props = last();
    expect(props.options.indexAxis).toBe('y');
    expect(props.options.plugins.legend.display).toBe(false);
    expect(props.options.scales.x.stacked).toBe(false);
    expect(props.data.labels).toEqual(['Pods', 'CRM']);
    expect(props.data.datasets[0]).toMatchObject({ label: 'Cost', data: [2, 1], borderWidth: 0, borderRadius: 4 });
    expect(props.options.plugins.tooltip.callbacks.label({ dataset: { label: 'Cost' }, parsed: { x: 2 } })).toBe('Cost: $2');
    expect(props.options.plugins.tooltip.callbacks.label({ dataset: { label: 'Cost' }, parsed: { x: null } })).toBe('Cost: $0');
  });

  it('stacks two series with a legend and a surface gap between segments', () => {
    renderWithProviders(
      <RankBars
        labels={['Moderation']}
        series={[
          { label: 'Code', data: [3] },
          { label: 'AI', data: [1] },
        ]}
        format={String}
        summary="By category"
        emptyText="none"
      />
    );

    const props = last();
    expect(props.options.plugins.legend.display).toBe(true);
    expect(props.options.scales.y.stacked).toBe(true);
    expect(props.data.datasets.map((d) => d.borderWidth)).toEqual([2, 2]);
    expect(props.data.datasets[0].backgroundColor).not.toBe(props.data.datasets[1].backgroundColor);
  });

  it('says there is nothing to rank instead of drawing an empty chart', () => {
    drawn.props = null;
    renderWithProviders(<RankBars labels={[]} series={[{ label: 'Cost', data: [] }]} format={String} summary="x" emptyText="No calls." />);

    expect(screen.getByText('No calls.')).toBeInTheDocument();
    expect(drawn.props).toBeNull();
  });
});

describe('TrendChart', () => {
  const days = ['2026-11-20', '2026-11-21'];

  it('stacks the parts of each day as bars, with a legend for several series', () => {
    renderWithProviders(
      <TrendChart
        type="bar"
        days={days}
        series={[
          { label: 'Answered', data: [4, 5] },
          { label: 'Failed', data: [1, 0] },
        ]}
        format={String}
        summary="Calls per day"
      />
    );

    expect(drawn.kind).toBe('bar');
    const props = last();
    expect(props.data.labels).toHaveLength(2);
    expect(props.options.scales.x.stacked).toBe(true);
    expect(props.options.scales.y.stacked).toBe(true);
    expect(props.options.plugins.legend.display).toBe(true);
    expect(props.data.datasets[1]).toMatchObject({ label: 'Failed', data: [1, 0] });
    expect(props['aria-label']).toBe('Calls per day');
  });

  it('draws one level as a filled line with no legend, and a tooltip in its own unit', () => {
    renderWithProviders(<TrendChart type="line" days={days} series={[{ label: 'Cost', data: [0.5, 1] }]} format={usdish} summary="Cost per day" />);

    expect(drawn.kind).toBe('line');
    const props = last();
    expect(props.options.scales.y.stacked).toBe(false);
    expect(props.options.plugins.legend.display).toBe(false);
    expect(props.data.datasets[0]).toMatchObject({ label: 'Cost', fill: true });
    expect(props.options.plugins.tooltip.callbacks.label({ dataset: { label: 'Cost' }, parsed: { y: 1 } })).toBe('Cost: $1');
    expect(props.options.plugins.tooltip.callbacks.label({ dataset: { label: 'Cost' }, parsed: { y: null } })).toBe('Cost: $0');
  });
});

describe('rankBy', () => {
  const rows = [
    { name: 'b', value: 2 },
    { name: 'a', value: 2 },
    { name: 'zero', value: 0 },
    { name: 'c', value: 9 },
  ];

  it('ranks biggest first, ties by label, and drops zeros', () => {
    expect(rankBy(rows, (r) => r.name, (r) => r.value)).toEqual({ labels: ['c', 'a', 'b'], values: [9, 2, 2] });
  });

  it('keeps only the top of the list', () => {
    expect(rankBy(rows, (r) => r.name, (r) => r.value, 1).labels).toEqual(['c']);
    const many = Array.from({ length: 30 }, (_, i) => ({ name: `f${i}`, value: i + 1 }));
    expect(rankBy(many, (r) => r.name, (r) => r.value).labels).toHaveLength(TOP_N);
  });
});

describe('chart summaries', () => {
  it('names the top entry of a ranking, or says it is empty', () => {
    expect(rankSummary(t, 'Slowest', ['Pods', 'CRM'], [900, 100], (v) => `${v} ms`)).toBe(
      'ai.charts.rankSummary {"title":"Slowest","count":2,"top":"Pods","value":"900 ms"}'
    );
    expect(rankSummary(t, 'Slowest', [], [], String)).toBe('ai.charts.empty {"title":"Slowest"}');
  });

  it('spans a trend from its first to its last day, or says it is empty', () => {
    const day = (d: string) => `day(${d})`;
    expect(trendSummary(t, 'Cost', ['2026-11-01', '2026-11-02', '2026-11-03'], '$3', day)).toBe(
      'ai.charts.trendSummary {"title":"Cost","from":"day(2026-11-01)","to":"day(2026-11-03)","total":"$3"}'
    );
    expect(trendSummary(t, 'Cost', [], '$0', day)).toBe('ai.charts.empty {"title":"Cost"}');
  });

  it('prints percentages and rounded milliseconds through the copy', () => {
    expect(percent(t)(12.5)).toBe('ai.charts.percent {"value":12.5}');
    expect(millis(t)(1234.6)).toBe('ai.features.ms {"ms":1235}');
  });
});
