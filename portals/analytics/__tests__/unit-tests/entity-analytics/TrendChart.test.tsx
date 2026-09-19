import { beforeEach, describe, expect, it, vi } from 'vitest';
import TrendChart from '../../../src/pages/entity-analytics/TrendChart';
import { byTestId, mount } from '../../dom';
import { COPY, trend } from '../../mocks/analytics';
import { charts, optionAt, resetCharts } from '../../mocks/charts';

vi.mock('react-chartjs-2', () => import('../../mocks/charts'));

type TooltipLabel = (item: { dataset: { label?: string }; parsed: { y: number } }) => string;
type TickFormat = (value: string | number) => string;

beforeEach(() => {
  resetCharts();
});

describe('TrendChart', () => {
  it('fills a lone series so its shape reads at a glance, with no legend', async () => {
    await mount(<TrendChart trend={trend()} label="Money collected" />);

    expect(byTestId('analytics-trend-revenue').querySelector('[aria-label="Money collected"]')).not.toBeNull();
    const [series] = charts.line?.data.datasets ?? [];
    expect(series).toMatchObject({ label: COPY['analytics.kpi.revenue'], data: [42000, 0, 185000], fill: true });
    expect(series.backgroundColor).not.toBe(series.borderColor);
    expect(optionAt(charts.line, 'plugins.legend.display')).toBe(false);
    expect(charts.line?.data.labels).toHaveLength(3);
  });

  it('keeps several series as crossing lines under a legend, each named', async () => {
    const pods = trend({
      key: 'pods',
      format: 'COUNT',
      series: [
        { key: 'pods_held', values: [4, 6, 5] },
        { key: 'pods_cancelled', values: [0, 1, 0] },
        { key: 'brand_new_series', values: [1, 1, 1] },
      ],
    });
    await mount(<TrendChart trend={pods} label="Pods held and cancelled" />);

    const datasets = charts.line?.data.datasets ?? [];
    // A tile's own words, then a series-only name, then the raw key.
    expect(datasets.map((dataset) => dataset.label)).toEqual([
      COPY['analytics.kpi.podsHeld'],
      COPY['analytics.series.podsCancelled'],
      'brand_new_series',
    ]);
    expect(datasets.every((dataset) => dataset.fill === false && dataset.backgroundColor === dataset.borderColor)).toBe(true);
    expect(optionAt(charts.line, 'plugins.legend.display')).toBe(true);
  });

  it('formats the tooltip and the value axis the way the trend is measured', async () => {
    await mount(<TrendChart trend={trend()} label="Money collected" />);

    const label = optionAt(charts.line, 'plugins.tooltip.callbacks.label') as TooltipLabel;
    expect(label({ dataset: { label: 'Collected' }, parsed: { y: 185000 } })).toBe('Collected: ₹1.9L');
    expect(label({ dataset: {}, parsed: { y: 0 } })).toBe(': ₹0');

    const tick = optionAt(charts.line, 'scales.y.ticks.callback') as TickFormat;
    expect(tick(250000)).toBe('₹2.5L');
  });
});
