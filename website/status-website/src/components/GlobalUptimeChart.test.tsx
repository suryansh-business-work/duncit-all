import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GlobalUptimeChart from './GlobalUptimeChart';
import type { GlobalDaily } from '../types';

const captured = vi.hoisted(() => ({ bar: [] as Array<Record<string, any>> }));

vi.mock('react-chartjs-2', () => ({
  Bar: (props: Record<string, any>) => {
    captured.bar.push(props);
    return null;
  },
}));

const global: GlobalDaily[] = [
  { date: '2026-07-10', uptime: 100, state: 'operational', operational: 5, total: 5 },
  { date: '2026-07-11', uptime: 93.2, state: 'major_outage', operational: 3, total: 5 },
];

describe('GlobalUptimeChart', () => {
  it('renders nothing when there is no global data', () => {
    const { container } = render(<GlobalUptimeChart global={undefined} overallUptime={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the header uptime and a bar dataset from the daily data', () => {
    captured.bar.length = 0;
    render(<GlobalUptimeChart global={global} overallUptime={99.87} />);
    expect(screen.getByText('99.87%')).toBeTruthy();

    const props = captured.bar.at(-1)!;
    expect(props.data.labels).toEqual(['07-10', '07-11']);
    expect(props.data.datasets[0].data).toEqual([100, 93.2]);

    const { tooltip } = props.options.plugins;
    // title resolves the hovered day's date, or '' when the index is out of range.
    expect(tooltip.callbacks.title([{ dataIndex: 0 }])).toBe('2026-07-10');
    expect(tooltip.callbacks.title([])).toBe('');
    // label appends the operational/total suffix when the day exists.
    expect(tooltip.callbacks.label({ dataIndex: 1, raw: 93.2 })).toBe('93.20% · 3/5 operational');
    // out-of-range index -> no suffix, and a null raw coalesces to 0.
    expect(tooltip.callbacks.label({ dataIndex: 99, raw: null })).toBe('0.00%');
    // y-axis tick formatter appends a percent sign.
    expect(props.options.scales.y.ticks.callback(95)).toBe('95%');
  });
});
