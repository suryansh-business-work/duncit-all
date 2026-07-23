import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TelemetryDashboardData } from '../../src/pages/telemetry-dashboard/queries';

interface QueryResult {
  data?: { telemetryDashboard: TelemetryDashboardData };
  loading: boolean;
  error?: { message: string };
}

const m = vi.hoisted(() => ({
  result: { loading: false } as QueryResult,
  variables: undefined as unknown,
}));

vi.mock('@apollo/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client')>();
  return {
    ...actual,
    useQuery: (_q: unknown, opts: { variables?: unknown }) => {
      m.variables = opts?.variables;
      return m.result;
    },
  };
});
vi.mock('../../src/pages/telemetry-dashboard/DistributionCard', () => ({
  default: (p: { title: string; buckets: unknown[] }) => (
    <div>
      dist:{p.title}:{p.buckets.length}
    </div>
  ),
}));
vi.mock('../../src/pages/telemetry-dashboard/RecentLogsTable', () => ({
  default: () => <div>recent-logs</div>,
}));

import TelemetryDashboardPage from '../../src/pages/telemetry-dashboard/index';

const makeData = (over: Partial<TelemetryDashboardData> = {}): TelemetryDashboardData => ({
  range_days: 7,
  total_logs: 100,
  active_bugs: 4,
  by_level: [
    { key: 'error', count: 12 },
    { key: 'info', count: 50 },
  ],
  by_source: [{ key: 'mweb', count: 80 }],
  by_environment: [{ key: 'production', count: 90 }],
  series: [],
  top_bugs: [
    { id: 'b1', title: 'Boom', source: 'mweb', page: '/x', occurrence_count: 7, status: 'OPEN' },
  ],
  ...over,
});

beforeEach(() => {
  m.result = { loading: false };
  m.variables = undefined;
});

describe('TelemetryDashboardPage', () => {
  it('shows a spinner while loading with no data', () => {
    m.result = { loading: true };
    render(<TelemetryDashboardPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows an error alert', () => {
    m.result = { loading: false, error: { message: 'query boom' } };
    render(<TelemetryDashboardPage />);
    expect(screen.getByText('query boom')).toBeInTheDocument();
  });

  it('renders the header but no content when the query returns no data', () => {
    m.result = { loading: false };
    render(<TelemetryDashboardPage />);
    expect(screen.getByText('Telemetry Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('TOTAL LOGS')).not.toBeInTheDocument();
  });

  it('renders stats, distributions and top bugs from a full payload', () => {
    m.result = { loading: false, data: { telemetryDashboard: makeData() } };
    render(<TelemetryDashboardPage />);
    expect(screen.getByText('TOTAL LOGS')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    // errorCount taken from the by_level 'error' bucket
    expect(screen.getByText('12')).toBeInTheDocument();
    // TopBugRow renders
    expect(screen.getByText('Boom')).toBeInTheDocument();
    expect(screen.getByText('dist:By level:2')).toBeInTheDocument();
    expect(screen.getByText('recent-logs')).toBeInTheDocument();
  });

  it('handles a payload with no error bucket and no open bugs', () => {
    m.result = {
      loading: false,
      data: {
        telemetryDashboard: makeData({ by_level: [{ key: 'info', count: 5 }], top_bugs: [] }),
      },
    };
    render(<TelemetryDashboardPage />);
    expect(screen.getByText('No open bugs — nice.')).toBeInTheDocument();
  });

  it('changes the range and re-queries with the new window', () => {
    m.result = { loading: false, data: { telemetryDashboard: makeData() } };
    render(<TelemetryDashboardPage />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Last 30 days' }));
    expect(m.variables).toEqual({ range_days: 30 });
  });
});
