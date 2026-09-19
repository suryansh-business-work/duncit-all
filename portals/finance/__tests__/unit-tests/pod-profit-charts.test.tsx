import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import PodChartsPanel from '../../src/pages/calculators/pod-profit/charts/PodChartsPanel';
import ComparisonChartsPanel from '../../src/pages/calculators/pod-profit/charts/ComparisonChartsPanel';
import { compactRupees } from '../../src/pages/calculators/pod-profit/charts/chartSetup';
import { calculatePodProfit } from '../../src/pages/calculators/pod-profit/calculate';
import { DEFAULT_INPUTS, formatRupees, type PodProfitInputs } from '../../src/pages/calculators/pod-profit/types';
import { rowsOf, sumPods } from '../../src/pages/calculators/pod-profit/saved/types';
import { renderWithProviders } from '../testkit';

/**
 * jsdom has no canvas, so chart.js never builds a chart and never calls the
 * tooltip or axis callbacks the charts hand it. This probe stands in for
 * react-chartjs-2 and does what chart.js would: for every plotted point it asks
 * the chart's own options for the tooltip line (a doughnut's `parsed` is the
 * number, a bar's is an {x, y} point) and, where the chart has a money axis,
 * for the tick label — then lists them, so the test reads what a user would.
 */
vi.mock('react-chartjs-2', async () => {
  const { createElement } = await import('react');

  interface ProbeProps {
    'aria-label': string;
    data: { labels: string[]; datasets: { label?: string; data: number[] }[] };
    options: {
      plugins: { tooltip: { callbacks: { label: (ctx: unknown) => string } } };
      scales?: { y: { ticks: { callback: (value: number) => string } } };
    };
  }

  const linesOf = (kind: 'bar' | 'doughnut', { data, options }: ProbeProps): string[] => {
    const out: string[] = [];
    for (const dataset of data.datasets) {
      for (const [index, value] of dataset.data.entries()) {
        const parsed = kind === 'bar' ? { x: index, y: value } : value;
        out.push(options.plugins.tooltip.callbacks.label({ parsed, dataset, label: data.labels[index] }));
        if (options.scales) out.push(`tick ${options.scales.y.ticks.callback(value)}`);
      }
    }
    return [...new Set(out)];
  };

  const probe = (kind: 'bar' | 'doughnut') =>
    function ChartProbe(props: Readonly<ProbeProps>) {
      const items = linesOf(kind, props).map((text) => createElement('li', { key: text }, text));
      return createElement('ul', { 'aria-label': props['aria-label'] }, items);
    };

  return { Bar: probe('bar'), Doughnut: probe('doughnut') };
});

const chart = (name: string) => within(screen.getByRole('list', { name }));

// Ten pods on the shipped defaults, each carrying ₹300 venue, ₹2,000 host and
// ₹1,000 Duncit costs: venue ₹3,600 → ₹600 net, host ₹2,00,223.4 → ₹1,80,223.4,
// Duncit ₹41,939.3 → ₹31,939.3, GST ₹44,237.3.
const tenPods: PodProfitInputs = {
  ...DEFAULT_INPUTS,
  pod_count: 10,
  expenses: [
    { expense_key: 'venue-cleaning', label: 'Cleaning', amount: 300, borne_by: 'VENUE' },
    { expense_key: 'host-travel', label: 'Coach travel', amount: 2000, borne_by: 'HOST' },
    { expense_key: 'duncit-kit', label: 'Bibs and cones', amount: 1000, borne_by: 'DUNCIT' },
  ],
};

describe('PodChartsPanel', () => {
  it('splits the collection four ways, naming each slice by its category', () => {
    renderWithProviders(<PodChartsPanel results={calculatePodProfit(tenPods)} />);
    const donut = chart('Where the money goes');

    expect(donut.getByText(`GST: ${formatRupees(44237.3)}`)).toBeInTheDocument();
    expect(donut.getByText(`Venue receives: ${formatRupees(3600)}`)).toBeInTheDocument();
    expect(donut.getByText(`Host receives: ${formatRupees(200223.4)}`)).toBeInTheDocument();
    expect(donut.getByText(`Duncit revenue: ${formatRupees(41939.3)}`)).toBeInTheDocument();
    // A doughnut has no money axis.
    expect(donut.queryByText(/^tick/)).toBeNull();
    expect(screen.getByText(/always adds back up to the total collection/)).toBeInTheDocument();
  });

  it('draws gross against net per side on a compact rupee axis', () => {
    renderWithProviders(<PodChartsPanel results={calculatePodProfit(tenPods)} />);
    const bars = chart('Gross vs net by party');

    expect(bars.getByText(`Gross: ${formatRupees(3600)}`)).toBeInTheDocument();
    expect(bars.getByText(`Net: ${formatRupees(600)}`)).toBeInTheDocument();
    expect(bars.getByText(`Net: ${formatRupees(180223.4)}`)).toBeInTheDocument();
    expect(bars.getByText(`Net: ${formatRupees(31939.3)}`)).toBeInTheDocument();
    // Lakh, thousand and plain-rupee ticks.
    expect(bars.getByText('tick ₹2.0L')).toBeInTheDocument();
    expect(bars.getByText('tick ₹41.9k')).toBeInTheDocument();
    expect(bars.getByText('tick ₹600')).toBeInTheDocument();
  });

  it('draws a host shortfall as an empty slice but a negative bar', () => {
    // A ₹30,000 venue slot leaves the host ₹7,352.96 short.
    const results = calculatePodProfit({ ...DEFAULT_INPUTS, venue_amount: 30000 });
    renderWithProviders(<PodChartsPanel results={results} />);

    expect(chart('Where the money goes').getByText(`Host receives: ${formatRupees(0)}`)).toBeInTheDocument();
    const bars = chart('Gross vs net by party');
    expect(bars.getByText(`Gross: ${formatRupees(-7352.96)}`)).toBeInTheDocument();
    expect(bars.getByText('tick ₹-7.4k')).toBeInTheDocument();
  });

  it('shows the empty state rather than a chart of zeroes', () => {
    renderWithProviders(
      <PodChartsPanel results={calculatePodProfit({ ...DEFAULT_INPUTS, pod_amount: 0, venue_amount: 0 })} />,
    );
    expect(screen.getAllByText('Enter a ticket price and spots to see the charts.')).toHaveLength(2);
    expect(screen.queryAllByRole('list')).toHaveLength(0);
  });
});

describe('ComparisonChartsPanel', () => {
  const rowsFor = (inputs: PodProfitInputs[]) =>
    rowsOf(inputs.map((entry, index) => ({ pod_key: `pod-${index + 1}`, name: `Pod ${index + 1}`, inputs: entry })));

  it('stacks every pod by where its money goes, scaled by its own count', () => {
    const rows = rowsFor([DEFAULT_INPUTS, { ...DEFAULT_INPUTS, pod_amount: 500, pod_count: 3 }]);
    renderWithProviders(<ComparisonChartsPanel rows={rows} totals={sumPods(rows)} />);
    const pods = chart('Pods compared');

    // The ₹1,000 pod once, and the ₹500 pod three times over.
    expect(pods.getByText(`Venue receives: ${formatRupees(360)}`)).toBeInTheDocument();
    expect(pods.getByText(`Venue receives: ${formatRupees(1080)}`)).toBeInTheDocument();
    expect(pods.getByText(`GST: ${formatRupees(4423.73)}`)).toBeInTheDocument();
    expect(pods.getByText(`Host receives: ${formatRupees(rows[1].results.scaled.host_receives)}`)).toBeInTheDocument();
    expect(pods.getByText(`Duncit revenue: ${formatRupees(rows[0].results.scaled.duncit_revenue_total)}`)).toBeInTheDocument();
    expect(pods.getByText('tick ₹360')).toBeInTheDocument();

    // The whole-comparison views read the totals.
    const totals = sumPods(rows);
    expect(chart('Where the money goes').getByText(`GST: ${formatRupees(totals.gst_amount)}`)).toBeInTheDocument();
    expect(chart('Gross vs net by party').getByText(`Gross: ${formatRupees(totals.venue_receives)}`)).toBeInTheDocument();
  });

  it('shows the empty state for pods that collect nothing', () => {
    const rows = rowsFor([{ ...DEFAULT_INPUTS, pod_amount: 0, venue_amount: 0 }]);
    renderWithProviders(<ComparisonChartsPanel rows={rows} totals={sumPods(rows)} />);
    expect(screen.getAllByText('Enter a ticket price and spots to see the charts.')).toHaveLength(3);
  });
});

describe('compactRupees', () => {
  it('shortens both directions of the axis the same way', () => {
    expect(compactRupees(150000)).toBe('₹1.5L');
    expect(compactRupees(-250000)).toBe('₹-2.5L');
    expect(compactRupees(1200)).toBe('₹1.2k');
    expect(compactRupees(450.4)).toBe('₹450');
    expect(compactRupees(0)).toBe('₹0');
  });
});
