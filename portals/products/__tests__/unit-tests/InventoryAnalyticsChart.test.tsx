import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import InventoryAnalyticsChart from '../../src/pages/inventory-page/inventory-product-page/InventoryAnalyticsChart';

const chart = vi.hoisted(() => ({ instances: [] as any[] }));
vi.mock('chart.js', () => {
  class Chart {
    static register = vi.fn();
    data: any = { labels: [], datasets: [{ data: [] }, { data: [] }] };
    update = vi.fn();
    destroy = vi.fn();
    constructor(_canvas: unknown, config: any) {
      this.data = config.data;
      chart.instances.push(this);
    }
  }
  return {
    Chart,
    BarController: {},
    BarElement: {},
    CategoryScale: {},
    LinearScale: {},
    Tooltip: {},
    Legend: {},
  };
});

const points = (over: Array<Record<string, number>> = []) =>
  over.map((p, i) => ({ date: `2026-01-0${i + 1}`, in_qty: 0, out_qty: 0, net_qty: 0, ...p }));

afterEach(() => {
  chart.instances.length = 0;
  cleanup();
});

describe('InventoryAnalyticsChart', () => {
  it('shows a loading line before the first points arrive', () => {
    render(<InventoryAnalyticsChart points={[]} loading />);
    expect(screen.getByText(/Loading analytics/i)).toBeInTheDocument();
  });

  it('shows an empty message when every point is zero', () => {
    render(<InventoryAnalyticsChart points={points([{}, {}])} loading={false} />);
    expect(screen.getByText(/No stock activity in the last 30 days/i)).toBeInTheDocument();
  });

  it('renders a chart canvas and builds a Chart when there is activity', () => {
    const { container } = render(
      <InventoryAnalyticsChart points={points([{ in_qty: 3 }, { out_qty: 1 }])} loading={false} />,
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
    expect(chart.instances).toHaveLength(1);
    // Labels are the month-day slice of the date.
    expect(chart.instances[0].data.labels).toEqual(['01-01', '01-02']);
  });

  it('updates the existing chart instance when the points change', () => {
    const { rerender } = render(
      <InventoryAnalyticsChart points={points([{ in_qty: 3 }])} loading={false} />,
    );
    rerender(<InventoryAnalyticsChart points={points([{ in_qty: 3 }, { in_qty: 5 }])} loading={false} />);
    expect(chart.instances[0].update).toHaveBeenCalled();
  });
});
