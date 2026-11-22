import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import AiOverviewDashboardPage from '../../src/pages/overview-dashboard';
import {
  AI_OVERVIEW_DASHBOARD,
  OVERVIEW_POLL_MS,
  type OverviewDashboard,
} from '../../src/pages/overview-dashboard/queries';
import { OPENAI_LOG_ONE } from '../../src/pages/openai-logs/queries';
import { changeColor } from '../../src/pages/overview-dashboard/change';
import { renderWithProviders } from '../testkit';
import { answerQuery, queryOptions, resetApollo } from '../hooks-mock';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../hooks-mock')).hooks,
}));

vi.mock('@duncit/dashboard', () => ({
  DuncitDashboard: ({
    header,
    widgets,
  }: {
    header: ReactNode;
    widgets: { id: string; title?: string; headerActions?: ReactNode; content: ReactNode }[];
  }) => (
    <div data-testid="dashboard">
      {header}
      {widgets.map((widget) => (
        <section key={widget.id} data-testid={`widget-${widget.id}`} aria-label={widget.title ?? widget.id}>
          {widget.headerActions}
          {widget.content}
        </section>
      ))}
    </div>
  ),
}));

// Canvas charts are proven in charts.test; here each just names what it shows.
vi.mock('react-chartjs-2', () => {
  const stub = (props: { 'aria-label': string; data: { labels: string[] } }) => (
    <canvas role="img" aria-label={props['aria-label']} data-labels={props.data.labels.join('|')} />
  );
  return { Bar: stub, Line: stub };
});

/**
 * Dashboard — the AI portal's landing page.
 *
 * What has to hold: the range comes from the URL and the page reads itself
 * again on a timer; the headline tiles show the server's totals with their
 * change against the previous period (coloured only where the direction means
 * something); the charts rank what was used and leave out what was not; a
 * range with no calls says so; a failed load offers Retry, and a failed
 * refresh keeps the last figures; the latest calls open their full log.
 */
const dashboard = (over: Partial<OverviewDashboard> = {}): OverviewDashboard => ({
  range_days: 30,
  generated_at: '2026-11-22T10:00:00.000Z',
  totals: {
    calls: 140,
    success_calls: 126,
    failed_calls: 10,
    skipped_calls: 4,
    error_rate: 7.1,
    prompt_tokens: 4000,
    completion_tokens: 1900,
    total_tokens: 5900,
    cost_usd: 1.75,
    avg_duration_ms: 1714,
    active_users: 12,
    unpriced_calls: 0,
  },
  change: { calls: 40, cost_usd: -12.5, total_tokens: 0, active_users: 20, avg_duration_ms: 10, error_rate_points: -1.5 },
  series: [
    { date: '2026-11-21', calls: 60, success_calls: 55, failed_calls: 4, skipped_calls: 1, total_tokens: 2000, cost_usd: 0.75, avg_duration_ms: 1500, active_users: 7 },
    { date: '2026-11-22', calls: 80, success_calls: 71, failed_calls: 6, skipped_calls: 3, total_tokens: 3900, cost_usd: 1, avg_duration_ms: 1900, active_users: 9 },
  ],
  by_model: [
    { model: 'gpt-4o', calls: 100, failed_calls: 10, failure_rate: 10, total_tokens: 5000, cost_usd: 1.5, avg_duration_ms: 1200 },
    { model: '', calls: 4, failed_calls: 0, failure_rate: 0, total_tokens: 0, cost_usd: 0, avg_duration_ms: 0 },
  ],
  by_feature: [
    { key: 'moderation.pod', label: 'Pod moderation scan', module: 'Moderation', calls: 100, failed_calls: 10, total_tokens: 5000, cost_usd: 1.5, avg_duration_ms: 1200 },
    { key: 'support.assistant', label: 'Support chat reply', module: 'Support', calls: 40, failed_calls: 0, total_tokens: 900, cost_usd: 0.25, avg_duration_ms: 3000 },
  ],
  by_module: [
    { module: 'Moderation', calls: 100, cost_usd: 1.5 },
    { module: 'Support', calls: 40, cost_usd: 0.25 },
  ],
  features_total: 30,
  features_enabled: 28,
  top_users: [
    { user_id: 'u1', name: 'Asha Rao', calls: 50, cost_usd: 0.5 },
    { user_id: 'u2', name: '', calls: 5, cost_usd: 0.05 },
  ],
  monitoring: {
    scanned: 9,
    flagged: 2,
    blocked: 1,
    failed: 1,
    by_risk: [
      { key: 'PENDING', count: 0 },
      { key: 'LOW', count: 6 },
      { key: 'MEDIUM', count: 2 },
      { key: 'HIGH', count: 1 },
    ],
  },
  automation: {
    runs: 5,
    completed: 3,
    failed: 1,
    in_progress: 1,
    by_status: [
      { key: 'COMPLETED', count: 3 },
      { key: 'FAILED', count: 1 },
      { key: 'WAITING_REPLY', count: 1 },
    ],
    active_flows: 2,
    total_flows: 4,
  },
  recent: [
    { id: 'log-1', task_label: 'Support chat reply', model: 'gpt-4o-mini', status: 'FAILED', total_tokens: 0, cost_usd: 0, duration_ms: 3200, error_message: 'Request timed out', created_at: '2026-11-22T09:59:00.000Z' },
  ],
  ...over,
});

const tile = (id: string) => screen.getByTestId(`kpi-${id}`);
const labelsOf = (widget: string) =>
  within(screen.getByTestId(`widget-${widget}`)).getByRole('img').getAttribute('data-labels');

beforeEach(() => resetApollo());

describe('AiOverviewDashboardPage', () => {
  it('reads the range from the URL and refreshes itself on a timer', () => {
    answerQuery(AI_OVERVIEW_DASHBOARD, { loading: true });
    renderWithProviders(<AiOverviewDashboardPage />, { initialEntries: ['/?days=7'] });

    expect(queryOptions.get(AI_OVERVIEW_DASHBOARD)).toMatchObject({
      variables: { range_days: 7 },
      pollInterval: OVERVIEW_POLL_MS,
      fetchPolicy: 'cache-and-network',
    });
    expect(screen.getByRole('heading', { name: 'AI Portal Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).toBeNull();
  });

  it('shows the totals against the previous period, coloured only where direction matters', () => {
    answerQuery(AI_OVERVIEW_DASHBOARD, { data: { aiOverviewDashboard: dashboard() } });
    renderWithProviders(<AiOverviewDashboardPage />);

    expect(within(tile('cost')).getByText('$1.75')).toBeInTheDocument();
    expect(within(tile('cost')).getByText('-12.5% vs previous period')).toBeInTheDocument();
    expect(within(tile('calls')).getByText('+40% vs previous period')).toBeInTheDocument();
    expect(within(tile('tokens')).getByText('Same as previous period')).toBeInTheDocument();
    expect(within(tile('error-rate')).getByText('7.1%')).toBeInTheDocument();
    expect(within(tile('error-rate')).getByText('-1.5 pts vs previous period')).toBeInTheDocument();
    expect(within(tile('latency')).getByText('1714 ms')).toBeInTheDocument();
    expect(within(tile('users')).getByText('12')).toBeInTheDocument();
    expect(within(tile('features')).getByText('28 of 30')).toBeInTheDocument();
    expect(within(tile('features')).getByText('2 used in this range')).toBeInTheDocument();
    expect(within(tile('scans')).getByText('2 flagged · 1 blocked · 1 failed')).toBeInTheDocument();
    expect(within(tile('runs')).getByText('1 failed · 2 of 4 flows on')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('charts every day and ranks only what was used, naming blanks', () => {
    answerQuery(AI_OVERVIEW_DASHBOARD, { data: { aiOverviewDashboard: dashboard() } });
    renderWithProviders(<AiOverviewDashboardPage />);

    expect(screen.getByRole('img', { name: /^Calls per day from .* 140 in total\.$/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^Active users per day from .* 12 in total\.$/ })).toBeInTheDocument();
    expect(labelsOf('model-cost')).toBe('gpt-4o');
    expect(labelsOf('model-calls')).toBe('gpt-4o|No model (never sent)');
    expect(labelsOf('feature-failures')).toBe('Pod moderation scan');
    expect(labelsOf('area-cost')).toBe('Moderation|Support');
    expect(labelsOf('users-calls')).toBe('Asha Rao|Deleted account');
    expect(labelsOf('scans-risk')).toBe('LOW|MEDIUM|HIGH');
    expect(screen.getByRole('link', { name: 'AI Features dashboard' })).toHaveAttribute('href', '/ai-features/dashboard?days=30');
    expect(screen.getByRole('link', { name: 'All OpenAI logs' })).toHaveAttribute('href', '/openai/logs');
  });

  it('opens a recent call in the log drawer', () => {
    answerQuery(AI_OVERVIEW_DASHBOARD, { data: { aiOverviewDashboard: dashboard() } });
    renderWithProviders(<AiOverviewDashboardPage />);

    const recent = within(screen.getByTestId('widget-recent-calls'));
    expect(recent.getByText('Request timed out')).toBeInTheDocument();
    fireEvent.click(recent.getByRole('button', { name: /^Open the log of Support chat reply at / }));

    expect(queryOptions.get(OPENAI_LOG_ONE)).toMatchObject({ variables: { id: 'log-1' }, skip: false });
  });

  it('says so when the range has no calls, instead of drawing empty rankings', () => {
    const idle = dashboard({
      totals: { ...dashboard().totals, calls: 0, cost_usd: 0, error_rate: 0, active_users: 0 },
      change: { calls: null, cost_usd: null, total_tokens: null, active_users: null, avg_duration_ms: null, error_rate_points: null },
      by_model: [],
      by_feature: [],
      by_module: [],
      top_users: [],
      monitoring: { scanned: 0, flagged: 0, blocked: 0, failed: 0, by_risk: [{ key: 'HIGH', count: 0 }] },
      automation: { ...dashboard().automation, runs: 0, by_status: [] },
      recent: [],
    });
    answerQuery(AI_OVERVIEW_DASHBOARD, { data: { aiOverviewDashboard: idle } });
    renderWithProviders(<AiOverviewDashboardPage />);

    expect(screen.getByText('No AI calls in this range. The figures fill in as AI features are used.')).toBeInTheDocument();
    expect(within(tile('calls')).getByText('No calls in the previous period')).toBeInTheDocument();
    expect(screen.getAllByText('No AI calls in this range.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('No signed-in person made an AI call in this range.')).toHaveLength(2);
    expect(screen.getByText('No images were checked in this range.')).toBeInTheDocument();
    expect(screen.getByText('No live automation runs in this range.')).toBeInTheDocument();
    expect(screen.getByText('No AI calls yet.')).toBeInTheDocument();
  });

  it('warns that costs are a minimum when a model has no rate', () => {
    const unpriced = dashboard({ totals: { ...dashboard().totals, unpriced_calls: 3 } });
    answerQuery(AI_OVERVIEW_DASHBOARD, { data: { aiOverviewDashboard: unpriced } });
    renderWithProviders(<AiOverviewDashboardPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('3 call(s) used a model with no rate card entry');
  });

  it('offers Retry when the first load fails', () => {
    const refetch = answerQuery(AI_OVERVIEW_DASHBOARD, { error: new Error('boom') });
    renderWithProviders(<AiOverviewDashboardPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the AI Portal Dashboard.');
    expect(screen.queryByTestId('dashboard')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps the last figures when a refresh fails, and says so', () => {
    answerQuery(AI_OVERVIEW_DASHBOARD, { data: { aiOverviewDashboard: dashboard() }, error: new Error('boom') });
    renderWithProviders(<AiOverviewDashboardPage />);

    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/^Could not refresh the Dashboard\. The figures shown were read at /);
    expect(within(tile('cost')).getByText('$1.75')).toBeInTheDocument();
  });

  it('reads the Dashboard again when the range changes', () => {
    answerQuery(AI_OVERVIEW_DASHBOARD, { data: { aiOverviewDashboard: dashboard() } });
    renderWithProviders(<AiOverviewDashboardPage />);

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Range' }));
    fireEvent.click(screen.getByRole('option', { name: 'Last 90 days' }));

    expect(queryOptions.get(AI_OVERVIEW_DASHBOARD)?.variables).toEqual({ range_days: 90 });
  });
});

describe('change colours', () => {
  it('colours a move the good way green and the bad way red', () => {
    expect(changeColor(-2, 'down')).toBe('success.main');
    expect(changeColor(2, 'down')).toBe('error.main');
    expect(changeColor(5, 'up')).toBe('success.main');
    expect(changeColor(-5, 'up')).toBe('error.main');
  });

  it('leaves spend, no change and no baseline in the default colour', () => {
    expect(changeColor(50, 'neither')).toBeUndefined();
    expect(changeColor(0, 'down')).toBeUndefined();
    expect(changeColor(null, 'up')).toBeUndefined();
  });
});
