import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import EntityAnalyticsPage from '../../../src/pages/entity-analytics/EntityAnalyticsPage';
import { ANALYTICS_PAGES } from '../../../src/pages/entity-analytics/pages';
import { ENTITY_ANALYTICS, type EntityAnalytics } from '../../../src/pages/entity-analytics/queries';
import { byTestId, click, mount, queryTestId, waitUntil } from '../../dom';
import { COPY, board, kpi } from '../../mocks/analytics';

// The grid (GridStack) is @duncit/dashboard's own subject. What this page owns
// is which dashboard it is, the header above it and the widgets it hands in.
vi.mock('@duncit/dashboard', () => ({
  DuncitDashboard: ({
    dashboardId,
    header,
    widgets,
  }: Readonly<{ dashboardId: string; header: ReactNode; widgets: Array<{ id: string; title?: string }> }>) => (
    <div data-testid="dashboard" data-dashboard-id={dashboardId}>
      {header}
      {widgets.map((widget) => (
        <section key={widget.id} data-testid={`widget-${widget.id}`}>
          {widget.title}
        </section>
      ))}
    </div>
  ),
}));

const PODS_PAGE = ANALYTICS_PAGES[1];

const answer = (days: number, value: EntityAnalytics): MockedResponse => ({
  request: { query: ENTITY_ANALYTICS, variables: { entity: 'PODS', days } },
  result: { data: { entityAnalytics: value } },
});

const failure = (message: string): MockedResponse => ({
  request: { query: ENTITY_ANALYTICS, variables: { entity: 'PODS', days: 30 } },
  result: { errors: [new GraphQLError(message)] },
});

const renderPage = (mocks: MockedResponse[]) =>
  mount(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <EntityAnalyticsPage page={PODS_PAGE} />
    </MockedProvider>,
  );

const pressed = (days: number) => byTestId(`analytics-period-${days}`).getAttribute('aria-pressed');
const retryButton = () =>
  [...document.querySelectorAll('button')].find((button) => button.textContent === COPY['analytics.page.retry']);

describe('EntityAnalyticsPage', () => {
  it('shows its heading and period at once, and a loader until the numbers arrive', async () => {
    await renderPage([answer(30, board())]);

    const page = byTestId('analytics-page-pods');
    expect(page.textContent).toContain(COPY['analytics.page.pods.title']);
    expect(page.textContent).toContain(COPY['analytics.page.pods.subtitle']);
    expect(pressed(30)).toBe('true');
    expect(queryTestId('loader')).not.toBeNull();
    expect(queryTestId('dashboard')).toBeNull();
  });

  it('hands every number to its own saved dashboard once they arrive', async () => {
    await renderPage([answer(30, board())]);

    await waitUntil(() => expect(queryTestId('dashboard')).not.toBeNull());
    expect(byTestId('dashboard').dataset.dashboardId).toBe('analytics.pods');
    expect(queryTestId('widget-kpi-fill_rate')).not.toBeNull();
    expect(byTestId('widget-leaderboard-top_clubs').textContent).toBe(COPY['analytics.leaderboard.topClubs']);
    // The heading rides inside the grid's header slot, above the widgets.
    expect(byTestId('dashboard').textContent).toContain(COPY['analytics.page.pods.title']);
    expect(queryTestId('loader')).toBeNull();
  });

  it('keeps the last numbers on screen while another period loads, then swaps them', async () => {
    await renderPage([answer(30, board()), answer(7, board({ kpis: [kpi({ key: 'revenue', format: 'CURRENCY' })] }))]);
    await waitUntil(() => expect(queryTestId('widget-kpi-pods_held')).not.toBeNull());

    await click(byTestId('analytics-period-7'));
    expect(pressed(7)).toBe('true');
    expect(queryTestId('dashboard')).not.toBeNull();

    await waitUntil(() => expect(queryTestId('widget-kpi-revenue')).not.toBeNull());
    expect(queryTestId('widget-kpi-pods_held')).toBeNull();
  });

  it('ignores a press on the period already showing', async () => {
    await renderPage([answer(30, board())]);
    await click(byTestId('analytics-period-30'));
    expect(pressed(30)).toBe('true');
  });

  it('explains a failed load and loads again on Retry', async () => {
    await renderPage([failure('Analytics is warming up.'), answer(30, board())]);

    await waitUntil(() => expect(byTestId('analytics-page-pods').textContent).toContain('Analytics is warming up.'));
    expect(byTestId('analytics-page-pods').textContent).toContain(COPY['analytics.page.loadFailed']);
    expect(queryTestId('loader')).toBeNull();

    const retry = retryButton();
    if (!retry) throw new Error('no Retry button');
    await click(retry);

    await waitUntil(() => expect(queryTestId('dashboard')).not.toBeNull());
    expect(byTestId('dashboard').textContent).not.toContain('Analytics is warming up.');
  });

  it('keeps explaining when Retry fails too', async () => {
    await renderPage([failure('Analytics is warming up.'), failure('Analytics is still warming up.')]);
    await waitUntil(() => expect(retryButton()).toBeTruthy());

    const retry = retryButton();
    if (!retry) throw new Error('no Retry button');
    await click(retry);

    await waitUntil(() =>
      expect(byTestId('analytics-page-pods').textContent).toContain('Analytics is still warming up.'),
    );
    expect(queryTestId('dashboard')).toBeNull();
  });
});
