import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { differenceInCalendarDays } from 'date-fns';
import { MCP_USAGE_DASHBOARD } from '../../../src/pages/dashboard/queries';
import { charts, resetCharts } from '../../mocks/charts';
import { resetTableProbe } from '../../mocks/table-stub';
import { usageSummary } from '../../mocks/fixtures';
import { renderWithProviders } from '../../testkit';

const m = vi.hoisted(() => ({ manager: true, seen: [] as Array<Record<string, unknown>> }));
vi.mock('../../../src/lib/roles', () => ({ useIsMcpManager: () => m.manager }));
vi.mock('react-chartjs-2', () => import('../../mocks/charts'));
vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../../mocks/table-stub')).StubTable,
}));

import DashboardPage from '../../../src/pages/dashboard/DashboardPage';

const dashboardMock = (summary: ReturnType<typeof usageSummary>, currency = 'USD'): MockedResponse => ({
  request: {
    query: MCP_USAGE_DASHBOARD,
    variables: (vars: Record<string, unknown>) => {
      m.seen.push(vars);
      return true;
    },
  },
  result: {
    data: {
      mcpUsageSummary: summary,
      latestCall: {
        __typename: 'McpToolCallTablePage',
        rows: currency ? [{ __typename: 'McpToolCall', id: 'call-1', currency }] : [],
      },
    },
  },
  maxUsageCount: 5,
});

beforeEach(() => {
  m.manager = true;
  m.seen = [];
  resetCharts();
  resetTableProbe();
});

describe('DashboardPage', () => {
  it('asks for the last 30 days, everyone’s calls, on first load', async () => {
    renderWithProviders(<DashboardPage />, { mocks: [dashboardMock(usageSummary())] });
    await screen.findByTestId('mcp-scope');
    const vars = m.seen[0] as { from: string; to: string; user_id: string | null };
    expect(vars.user_id).toBeNull();
    expect(differenceInCalendarDays(new Date(vars.to), new Date(vars.from))).toBe(30);
  });

  it('shows a manager everyone’s numbers, the daily chart, every breakdown and the person filter', async () => {
    renderWithProviders(<DashboardPage />, { mocks: [dashboardMock(usageSummary({ scope: 'ALL' }))] });
    expect(await screen.findByTestId('mcp-scope')).toHaveTextContent('Everyone’s calls');
    expect(screen.getByTestId('mcp-kpi-calls')).toHaveTextContent('1,234');
    expect(screen.getByTestId('mcp-kpi-cost')).toHaveTextContent('$3.50');
    expect(screen.getByRole('combobox', { name: /Person/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'By person' })).toBeInTheDocument();
    await waitFor(() => expect(charts.bar?.data.datasets[0].data).toContain(6));
  });

  it('shows anyone else their own calls, with no person filter', async () => {
    m.manager = false;
    renderWithProviders(<DashboardPage />, { mocks: [dashboardMock(usageSummary({ scope: 'MINE', by_user: [] }))] });
    expect(await screen.findByTestId('mcp-scope')).toHaveTextContent('Your calls');
    expect(screen.queryByRole('combobox', { name: /Person/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'By person' })).not.toBeInTheDocument();
  });

  it('says the window is empty instead of drawing empty charts', async () => {
    const quiet = usageSummary({
      by_day: [],
      by_tool: [],
      by_category: [],
      by_client: [],
      by_endpoint: [],
      by_status: [],
      by_user: [],
    });
    quiet.totals = { ...quiet.totals, calls: 0, errors: 0, blocked: 0, users: 0, input_tokens: 0, output_tokens: 0, cost: 0, avg_ms: 0 };
    renderWithProviders(<DashboardPage />, { mocks: [dashboardMock(quiet, '')] });
    expect(await screen.findByTestId('mcp-dashboard-empty')).toHaveTextContent('No tool calls in this window yet.');
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Top tools' })).not.toBeInTheDocument();
  });

  it('says it could not load, and loads again on Try again', async () => {
    renderWithProviders(<DashboardPage />, {
      mocks: [
        { request: { query: MCP_USAGE_DASHBOARD, variables: () => true }, error: new Error('Failed to fetch') },
        dashboardMock(usageSummary()),
      ],
    });
    expect(await screen.findByText('We could not load this. Please try again.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('mcp-scope')).toHaveTextContent('Everyone’s calls');
  });
});
