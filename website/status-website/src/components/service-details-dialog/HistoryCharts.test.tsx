import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HistoryCharts from './HistoryCharts';
import type { HistoryResponse } from '../../types';

const captured = vi.hoisted(() => ({
  bar: [] as Array<Record<string, any>>,
  line: [] as Array<Record<string, any>>,
}));

vi.mock('react-chartjs-2', () => ({
  Bar: (props: Record<string, any>) => {
    captured.bar.push(props);
    return null;
  },
  Line: (props: Record<string, any>) => {
    captured.line.push(props);
    return null;
  },
}));

const fullHistory: HistoryResponse = {
  service: 'api',
  daily: [
    { date: '2026-07-01', uptime: 99.95, state: 'operational' },
    { date: '2026-07-02', uptime: 96, state: undefined },
    { date: '2026-07-03', uptime: 80, state: undefined },
    { date: '2026-07-04', uptime: 99.99, state: undefined },
    { date: '2026-07-05', uptime: null, state: undefined },
  ],
  points: [
    { t: '2026-07-05T10:00:00.000Z', ok: true, status_code: 200, latency_ms: 120 },
    { t: '2026-07-05T10:05:00.000Z', ok: true, status_code: 200, latency_ms: null },
  ],
};

describe('HistoryCharts', () => {
  it('shows a warning when history failed to load', () => {
    render(<HistoryCharts history={null} failed />);
    expect(screen.getByText('History is unavailable right now.')).toBeTruthy();
  });

  it('shows a skeleton while loading', () => {
    const { container } = render(<HistoryCharts history={null} failed={false} />);
    expect(container.querySelector('.MuiSkeleton-root')).toBeTruthy();
  });

  it('shows an empty message when there is no daily or latency data', () => {
    render(
      <HistoryCharts history={{ service: 'api', daily: [], points: [] }} failed={false} />,
    );
    expect(screen.getByText(/No history recorded yet/)).toBeTruthy();
  });

  it('renders both charts and colours the uptime bars by threshold', () => {
    captured.bar.length = 0;
    captured.line.length = 0;
    render(<HistoryCharts history={fullHistory} failed={false} />);

    expect(screen.getByText('Daily uptime — last 90 days')).toBeTruthy();
    expect(screen.getByText('Latency — last 24 hours')).toBeTruthy();

    const bar = captured.bar.at(-1)!;
    expect(bar.data.labels).toEqual(['07-01', '07-02', '07-03', '07-04', '07-05']);
    // Distinct colours across the state / >=99.9 / >=95 / else / null branches.
    expect(new Set(bar.data.datasets[0].backgroundColor).size).toBeGreaterThanOrEqual(4);
    expect(bar.options.plugins.tooltip.callbacks.label({ raw: 99.9 })).toBe('Uptime 99.90%');
    expect(bar.options.plugins.tooltip.callbacks.label({ raw: null })).toBe('Uptime 0.00%');

    const line = captured.line.at(-1)!;
    expect(line.data.datasets[0].data).toEqual([120, null]);
    expect(line.data.labels.length).toBe(2);
  });

  it('notes when there are daily bars but no latency samples', () => {
    render(
      <HistoryCharts
        history={{
          service: 'api',
          daily: [{ date: '2026-07-01', uptime: 100, state: 'operational' }],
          points: [{ t: '2026-07-01T10:00:00.000Z', ok: true, status_code: 200, latency_ms: null }],
        }}
        failed={false}
      />,
    );
    expect(screen.getByText('No latency samples in the last 24 hours.')).toBeTruthy();
  });
});
