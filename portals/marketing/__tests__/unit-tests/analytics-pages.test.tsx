import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import type { ChartData } from 'chart.js';
import { renderWithProviders } from '../testkit';
import {
  analyticsAutomationMock,
  analyticsContentMock,
  analyticsFunnelMock,
  analyticsOverviewMock,
  analyticsSocialMock,
} from '../mocks';

vi.mock('@duncit/table', () => import('./table-mock'));

// jsdom has no canvas: the chart hands back the data it was given for the test to read.
vi.mock('react-chartjs-2', () => {
  const Chart = ({ data, 'aria-label': ariaLabel }: { data: ChartData; 'aria-label': string }) => (
    <div
      role="img"
      aria-label={ariaLabel}
      data-labels={JSON.stringify(data.labels)}
      data-series={JSON.stringify(data.datasets.map((set) => ({ label: set.label, data: set.data })))}
    />
  );
  return { Line: Chart, Bar: Chart };
});

// The picker's own calendar is MUI's to test; here it is a plain field that hands back what was typed.
vi.mock('@mui/x-date-pickers/DatePicker', async () => {
  const { parseISO } = await import('date-fns');
  return {
    DatePicker: ({ label, onChange }: { label: string; onChange: (date: Date | null) => void }) => (
      <input aria-label={label} onChange={(event) => onChange(event.target.value ? parseISO(event.target.value) : null)} />
    ),
  };
});

import AnalyticsOverviewPage from '../../src/pages/analytics-overview-page';
import AnalyticsSocialPage from '../../src/pages/analytics-social-page';
import AnalyticsContentPage from '../../src/pages/analytics-content-page';
import AnalyticsFunnelPage from '../../src/pages/analytics-funnel-page';
import AnalyticsAutomationPage from '../../src/pages/analytics-automation-page';

afterEach(() => {
  vi.clearAllMocks();
});

function Where() {
  const location = useLocation();
  return <output data-testid="where">{location.search}</output>;
}

const WINDOW = '?from=2026-10-01&to=2026-10-02';

const renderAt = (page: ReactElement, mocks: Parameters<typeof renderWithProviders>[1]['mocks'], search = WINDOW) =>
  renderWithProviders(page, {
    mocks,
    initialEntries: [`/a${search}`],
    routes: (
      <Route
        path="/a"
        element={
          <>
            {page}
            <Where />
          </>
        }
      />
    ),
  });

const series = (testId: string) => JSON.parse(screen.getByTestId(testId).querySelector('[role="img"]')?.getAttribute('data-series') ?? '[]');
const labels = (testId: string) => JSON.parse(screen.getByTestId(testId).querySelector('[role="img"]')?.getAttribute('data-labels') ?? '[]');

describe('Analytics › Overview', () => {
  it('shows the loading state, then every headline and the daily trend', async () => {
    const asked: Record<string, unknown>[] = [];
    renderAt(<AnalyticsOverviewPage />, [
      analyticsOverviewMock({}, { variables: (vars) => { asked.push(vars); return true; } }),
    ]);
    expect(screen.getByTestId('analytics-loading')).toBeInTheDocument();
    expect(await screen.findByTestId('kpi-followers')).toHaveTextContent('1,200');
    expect(screen.getByTestId('kpi-revenue')).toHaveTextContent('₹21,000');
    expect(screen.getByTestId('kpi-aiCost')).toHaveTextContent('$1.25');
    expect(screen.getByTestId('kpi-successRate')).toHaveTextContent('92.3%');
    expect(series('overview-trend').map((row: { label: string }) => row.label)).toEqual(['Engagement', 'New leads', 'Link clicks']);
    expect(asked[0]).toEqual({ input: { from: '2026-10-01', to: '2026-10-02', platforms: [] } });
  });

  it('says so when the read fails', async () => {
    renderAt(<AnalyticsOverviewPage />, [analyticsOverviewMock({}, { failWith: 'Access denied' })]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
  });
});

describe('Analytics › window filter', () => {
  it('opens on the last 30 days when the address names no window, and a preset rewrites it', async () => {
    renderAt(<AnalyticsOverviewPage />, [analyticsOverviewMock()], '');
    const preset = screen.getByTestId('analytics-preset');
    expect(within(preset).getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(preset).getByRole('button', { name: '7 days' }));
    await waitFor(() => expect(within(preset).getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByTestId('where').textContent).toMatch(/^\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/);
    // Pressing the chosen preset again keeps it.
    fireEvent.click(within(preset).getByRole('button', { name: '7 days' }));
    expect(within(preset).getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('takes a custom range, moving the other end when the two would cross, and ignores a day it cannot read', () => {
    renderAt(<AnalyticsOverviewPage />, [analyticsOverviewMock()]);
    const where = screen.getByTestId('where');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-20' } });
    expect(where).toHaveTextContent('?from=2026-09-20&to=2026-10-02');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-05' } });
    expect(where).toHaveTextContent('?from=2026-10-05&to=2026-10-05');
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-01' } });
    expect(where).toHaveTextContent('?from=2026-10-01&to=2026-10-01');
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'not-a-day' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '' } });
    expect(where).toHaveTextContent('?from=2026-10-01&to=2026-10-01');
    // A custom range is no preset.
    expect(within(screen.getByTestId('analytics-preset')).getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('falls back to 30 days for a window that ends before it starts', () => {
    renderAt(<AnalyticsOverviewPage />, [analyticsOverviewMock()], '?from=2026-10-05&to=2026-10-01');
    expect(within(screen.getByTestId('analytics-preset')).getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('picks networks into the address and back out', async () => {
    renderAt(<AnalyticsSocialPage />, [analyticsSocialMock()]);
    const where = screen.getByTestId('where');
    expect(screen.getByTestId('analytics-networks')).toHaveTextContent('All networks');
    fireEvent.mouseDown(within(screen.getByTestId('analytics-networks')).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Instagram' }));
    expect(where).toHaveTextContent('platforms=INSTAGRAM');
    expect(screen.getByTestId('analytics-networks')).toHaveTextContent('Instagram');
    fireEvent.click(screen.getByRole('option', { name: 'Instagram' }));
    expect(where.textContent).not.toContain('platforms');
  });
});

describe('Analytics › Social', () => {
  it('draws the headline, the trend, the networks, the growth and the best posts', async () => {
    renderAt(<AnalyticsSocialPage />, [analyticsSocialMock()], `${WINDOW}&platforms=INSTAGRAM`);
    expect(await screen.findByTestId('kpi-engagementRate')).toHaveTextContent('8.89%');
    // A network code the console has no label for is shown as it is.
    expect(labels('social-networks')).toEqual(['Instagram', 'MYSPACE']);
    expect(labels('social-growth')).toEqual(['Duncit IG']);
    expect(series('social-trend')[1]).toEqual({ label: 'Views', data: [6000, 3000] });
    const rows = await screen.findAllByTestId('table-row');
    expect(within(rows[0]).getByRole('link', { name: 'Diwali pods are live' })).toHaveAttribute('href', 'https://instagram.com/p/1');
    // No text and no link: named, not blank.
    expect(within(rows[1]).queryByRole('link')).not.toBeInTheDocument();
    expect(rows[1]).toHaveTextContent('Untitled post');
    // A link with no text still reads as something.
    expect(within(rows[2]).getByRole('link', { name: 'Untitled post' })).toHaveAttribute('href', 'https://x.com/duncit/3');
  });

  it('shows one empty state when nothing is connected or posted', async () => {
    renderAt(<AnalyticsSocialPage />, [analyticsSocialMock({ accounts: [], posts: 0 })]);
    expect(await screen.findByTestId('analytics-empty')).toHaveTextContent('Nothing in this window yet');
  });
});

describe('Analytics › Content & Reels', () => {
  it('draws formats, reels and the best time to post', async () => {
    renderAt(<AnalyticsContentPage />, [analyticsContentMock()]);
    expect(await screen.findByTestId('kpi-bestTime')).toHaveTextContent('Friday');
    expect(labels('content-formats')).toEqual(['Carousel', 'Video', 'Single image', 'Text only']);
    expect(labels('content-reels')).toEqual(['Diwali reel', 'Deleted reel']);
    expect(labels('content-weekday')[0]).toBe('Monday');
    expect(labels('content-hour')).toHaveLength(24);
  });

  it('says there is no best time when nothing was posted, and is empty when nothing was made', async () => {
    const { unmount } = renderAt(<AnalyticsContentPage />, [analyticsContentMock({ best_weekday: 4, best_hour: null })]);
    expect(await screen.findByTestId('kpi-bestTime')).toHaveTextContent('Not enough posts');
    unmount();
    renderAt(<AnalyticsContentPage />, [analyticsContentMock({ from_duncit: 0, from_networks: 0, reels_made: 0 })]);
    expect(await screen.findByTestId('analytics-empty')).toBeInTheDocument();
  });
});

describe('Analytics › Leads & Funnel', () => {
  it('draws the funnel with each step’s conversion, the sources and time in stage', async () => {
    renderAt(<AnalyticsFunnelPage />, [analyticsFunnelMock()]);
    expect(await screen.findByTestId('kpi-newLeads')).toHaveTextContent('9');
    expect(labels('funnel-steps')).toEqual(['New (100%)', 'Contacted (55.6%)']);
    expect(labels('funnel-sources')).toEqual(['Instagram', 'Imported']);
    expect(series('funnel-stage-time')).toEqual([{ label: 'Median hours', data: [10] }]);
    expect(screen.queryByTestId('analytics-networks')).not.toBeInTheDocument();
  });

  it('reads one pipeline from the address, and the picker changes it', async () => {
    const asked: Record<string, unknown>[] = [];
    renderAt(<AnalyticsFunnelPage />, [analyticsFunnelMock({}, { variables: (vars) => { asked.push(vars); return true; } })], `${WINDOW}&pipeline=HOST`);
    await screen.findByTestId('kpi-newLeads');
    expect(asked[0]).toEqual({ input: { from: '2026-10-01', to: '2026-10-02' }, pipeline: 'HOST' });
    const where = screen.getByTestId('where');
    fireEvent.mouseDown(within(screen.getByTestId('analytics-pipeline')).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Venue' }));
    expect(where).toHaveTextContent('pipeline=VENUE');
    fireEvent.mouseDown(within(screen.getByTestId('analytics-pipeline')).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'All pipelines' }));
    expect(where.textContent).not.toContain('pipeline');
  });

  it('is empty when the window has no new, converted or promoted lead', async () => {
    renderAt(<AnalyticsFunnelPage />, [analyticsFunnelMock({ new_leads: 0, converted: 0, promoted: 0 })]);
    expect(await screen.findByTestId('analytics-empty')).toBeInTheDocument();
  });
});

describe('Analytics › Automation', () => {
  it('draws runs, cost and outcomes, leaving out what did not run', async () => {
    renderAt(<AnalyticsAutomationPage />, [analyticsAutomationMock()]);
    expect(await screen.findByTestId('kpi-decisionTime')).toHaveTextContent('30 min');
    expect(screen.getByTestId('kpi-approvalsWaiting')).toHaveTextContent('2');
    expect(labels('automation-workflows')).toEqual(['Reel']);
    expect(labels('automation-statuses')).toEqual(['Done']);
    expect(labels('automation-agents')).toEqual(['Content planner']);
    expect(series('automation-trend')[1]).toEqual({ label: 'AI cost', data: [1, 0.25] });
  });

  it('is empty when nothing ran and nothing waits', async () => {
    renderAt(<AnalyticsAutomationPage />, [analyticsAutomationMock({ runs: 0, approvals: { waiting: 0, decided: 0, median_decision_minutes: 0 } })]);
    expect(await screen.findByTestId('analytics-empty')).toBeInTheDocument();
  });
});
