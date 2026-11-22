import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import AiFeaturesDashboardPage from '../../src/pages/ai-features-dashboard';
import { AI_FEATURES_DASHBOARD, type FeaturesDashboard, type DashboardFeature } from '../../src/pages/ai-features-dashboard/queries';
import { answeredRate, callSeries, costPerCall, failureRate, rankFeatures } from '../../src/pages/ai-features-dashboard/rankings';
import { renderWithProviders } from '../testkit';
import { answerQuery, queryOptions, resetApollo } from '../hooks-mock';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../hooks-mock')).hooks,
}));

vi.mock('@duncit/dashboard', () => ({
  DuncitDashboard: ({ header, widgets }: { header: ReactNode; widgets: { id: string; title?: string; content: ReactNode }[] }) => (
    <div data-testid="dashboard">
      {header}
      {widgets.map((widget) => (
        <section key={widget.id} data-testid={`widget-${widget.id}`} aria-label={widget.title ?? widget.id}>
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
 * AI Features › Dashboard — usage, cost, tokens and speed of every AI feature.
 *
 * What has to hold: the range comes from the URL like the features table; the
 * headline tiles show the server's totals; each chart ranks the right features
 * and leaves out the ones that did not use, cost or fail anything; switched-off
 * features link to their own page; and a load failure says so.
 */
const feature = (over: Partial<DashboardFeature>): DashboardFeature => ({
  key: 'moderation.pod',
  label: 'Pod moderation scan',
  module: 'Moderation',
  enabled: true,
  calls: 0,
  failed_calls: 0,
  skipped_calls: 0,
  total_tokens: 0,
  cost_usd: 0,
  avg_duration_ms: 0,
  ...over,
});

const FEATURES = [
  feature({ calls: 100, failed_calls: 10, total_tokens: 5000, cost_usd: 1.5, avg_duration_ms: 1200 }),
  feature({ key: 'support.assistant', label: 'Support chat reply', module: 'Support', calls: 40, total_tokens: 900, cost_usd: 0.25, avg_duration_ms: 3000 }),
  feature({ key: 'crm.lead_chat', label: 'Lead assistant chat', module: 'CRM', enabled: false }),
];

const dashboard = (over: Partial<FeaturesDashboard> = {}): FeaturesDashboard => ({
  range_days: 30,
  features_total: 3,
  features_enabled: 2,
  features_used: 2,
  calls: 140,
  failed_calls: 10,
  skipped_calls: 4,
  prompt_tokens: 4000,
  completion_tokens: 1900,
  total_tokens: 5900,
  cost_usd: 1.75,
  avg_duration_ms: 1714,
  unpriced_calls: 0,
  by_area: [
    { module: 'Moderation', features: 1, enabled: 1, calls: 100, failed_calls: 10, total_tokens: 5000, cost_usd: 1.5, avg_duration_ms: 1200 },
    { module: 'Support', features: 1, enabled: 1, calls: 40, failed_calls: 0, total_tokens: 900, cost_usd: 0.25, avg_duration_ms: 3000 },
    { module: 'CRM', features: 1, enabled: 0, calls: 0, failed_calls: 0, total_tokens: 0, cost_usd: 0, avg_duration_ms: 0 },
  ],
  series: [
    { date: '2026-11-21', calls: 60, failed_calls: 4, skipped_calls: 1, total_tokens: 2000, cost_usd: 0.75, avg_duration_ms: 1500 },
    { date: '2026-11-22', calls: 80, failed_calls: 6, skipped_calls: 3, total_tokens: 3900, cost_usd: 1, avg_duration_ms: 1900 },
  ],
  features: FEATURES,
  ...over,
});

const chart = (name: RegExp) => screen.getByRole('img', { name });
const labelsOf = (widget: string) =>
  within(screen.getByTestId(`widget-${widget}`)).getByRole('img').getAttribute('data-labels');

beforeEach(() => resetApollo());

describe('AiFeaturesDashboardPage', () => {
  it('asks for the range in the URL, the same window the features table uses', () => {
    answerQuery(AI_FEATURES_DASHBOARD, { loading: true });
    renderWithProviders(<AiFeaturesDashboardPage />, { initialEntries: ['/ai-features/dashboard?days=7'] });

    expect(queryOptions.get(AI_FEATURES_DASHBOARD)?.variables).toEqual({ range_days: 7 });
    expect(screen.getByRole('heading', { name: 'AI Features Dashboard' })).toBeInTheDocument();
    // The shared Loader announces itself as a status, not a progress bar.
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).toBeNull();
    expect(screen.getByRole('link', { name: 'All AI features' })).toHaveAttribute('href', '/ai-features?days=7');
  });

  it('shows only the header while there is no answer yet and nothing failed', () => {
    answerQuery(AI_FEATURES_DASHBOARD, {});
    renderWithProviders(<AiFeaturesDashboardPage />);

    expect(screen.getByRole('heading', { name: 'AI Features Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByTestId('dashboard')).toBeNull();
  });

  it('says the load failed when there is nothing to show', () => {
    answerQuery(AI_FEATURES_DASHBOARD, { error: new Error('boom') });
    renderWithProviders(<AiFeaturesDashboardPage />);

    expect(screen.getByText('Could not load the AI Features dashboard. Try again.')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).toBeNull();
  });

  it('shows the totals, trends, rankings and the switched-off features', () => {
    answerQuery(AI_FEATURES_DASHBOARD, { data: { aiFeaturesDashboard: dashboard() } });
    renderWithProviders(<AiFeaturesDashboardPage />);

    expect(screen.getByText('$1.75')).toBeInTheDocument();
    expect(screen.getByText('90% answered')).toBeInTheDocument();
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
    expect(screen.getByText('1 switched off')).toBeInTheDocument();
    expect(screen.getByText('10 failed · 4 skipped')).toBeInTheDocument();
    expect(screen.getByText('1714 ms')).toBeInTheDocument();
    // Daily trends span the range and carry their totals for screen readers.
    expect(chart(/^Calls per day from .* 140 in total\.$/)).toBeInTheDocument();
    expect(chart(/^Cost per day from .* \$1\.75 in total\.$/)).toBeInTheDocument();
    // Rankings leave out what used, cost or failed nothing.
    expect(labelsOf('cost-by-area')).toBe('Moderation|Support');
    expect(labelsOf('top-cost')).toBe('Pod moderation scan|Support chat reply');
    expect(labelsOf('slowest')).toBe('Support chat reply|Pod moderation scan');
    expect(labelsOf('failing')).toBe('Pod moderation scan');
    expect(chart(/^Highest failure rate: 1 entries, highest Pod moderation scan at 10%\.$/)).toBeInTheDocument();
    // A switched-off feature opens its own page, on the same range.
    expect(screen.getByRole('link', { name: 'Lead assistant chat' })).toHaveAttribute('href', '/ai-features/crm.lead_chat?days=30');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('warns that costs are a minimum when some calls used an unpriced model', () => {
    answerQuery(AI_FEATURES_DASHBOARD, { data: { aiFeaturesDashboard: dashboard({ unpriced_calls: 3 }) } });
    renderWithProviders(<AiFeaturesDashboardPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('3 call(s) used a model with no rate card entry');
  });

  it('shows empty states, not empty charts, for a range with no calls and nothing off', () => {
    const idle = FEATURES.map((f) => ({ ...f, enabled: true, calls: 0, failed_calls: 0, cost_usd: 0, avg_duration_ms: 0 }));
    answerQuery(AI_FEATURES_DASHBOARD, {
      data: {
        aiFeaturesDashboard: dashboard({
          calls: 0,
          failed_calls: 0,
          skipped_calls: 0,
          cost_usd: 0,
          features_used: 0,
          features_enabled: 3,
          by_area: [],
          features: idle,
        }),
      },
    });
    renderWithProviders(<AiFeaturesDashboardPage />);

    expect(screen.getAllByText('No AI feature calls in this range.')).toHaveLength(4);
    expect(screen.getByText('No AI feature failed in this range.')).toBeInTheDocument();
    expect(screen.getByText('Every AI feature is switched on.')).toBeInTheDocument();
    expect(screen.getByText('0% answered')).toBeInTheDocument();
  });

  it('refetches when the range changes', () => {
    answerQuery(AI_FEATURES_DASHBOARD, { data: { aiFeaturesDashboard: dashboard() } });
    renderWithProviders(<AiFeaturesDashboardPage />);

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Range' }));
    fireEvent.click(screen.getByRole('option', { name: 'Last 90 days' }));

    expect(queryOptions.get(AI_FEATURES_DASHBOARD)?.variables).toEqual({ range_days: 90 });
  });
});

describe('dashboard arithmetic', () => {
  it('rates failures per feature to one decimal, and a feature never called at zero', () => {
    expect(failureRate({ calls: 3, failed_calls: 1 })).toBe(33.3);
    expect(failureRate({ calls: 0, failed_calls: 0 })).toBe(0);
  });

  it('counts answered calls as neither failed nor skipped', () => {
    expect(answeredRate({ calls: 200, failed_calls: 10, skipped_calls: 10 })).toBe(90);
    expect(answeredRate({ calls: 0, failed_calls: 0, skipped_calls: 0 })).toBe(0);
  });

  it('averages cost per call, and zero with no calls', () => {
    expect(costPerCall({ calls: 4, cost_usd: 1 })).toBe(0.25);
    expect(costPerCall({ calls: 0, cost_usd: 0 })).toBe(0);
  });

  it('splits each day into answered, failed and skipped', () => {
    const [answered, failed, skipped] = callSeries(dashboard().series, { answered: 'A', failed: 'F', skipped: 'S' });

    expect(answered).toEqual({ label: 'A', data: [55, 71] });
    expect(failed.data).toEqual([4, 6]);
    expect(skipped.data).toEqual([1, 3]);
  });

  it('ranks features by label', () => {
    expect(rankFeatures(FEATURES, (f) => f.calls).labels).toEqual(['Pod moderation scan', 'Support chat reply']);
  });
});
