import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { GraphQLError } from 'graphql';
import AppInsightsPage from '../../../src/pages/app-insights/AppInsightsPage';
import { APP_INSIGHTS_STATUS } from '../../../src/pages/app-insights/queries';
import { initialPeriod, type PeriodState } from '../../../src/pages/entity-analytics/period-state';
import type { AnalyticsPageSpec } from '../../../src/pages/entity-analytics/pages';
import { byTestId, mount, queryTestId, waitUntil } from '../../dom';
import { COPY } from '../../mocks/analytics';
import { disconnectedApple, integration, statusMock } from '../../mocks/app-insights';

// The dashboard itself is EntityAnalyticsPage's subject; this page owns which
// dashboard a tab opens and what it puts around it.
vi.mock('../../../src/pages/entity-analytics/EntityAnalyticsPage', () => ({
  default: ({
    page,
    intro,
    actions,
    footer,
  }: Readonly<{ page: AnalyticsPageSpec; intro: ReactNode; actions: ReactNode; footer: (p: PeriodState) => ReactNode }>) => (
    <div data-testid="dashboard" data-entity={page.entity}>
      {intro}
      {actions}
      {footer({ ...initialPeriod(), range: { from: '2026-11-01', to: '2026-11-20' } })}
    </div>
  ),
}));
vi.mock('../../../src/pages/app-insights/DailyDataTable', () => ({
  default: ({ store, from, to }: Readonly<{ store: string; from: string; to: string }>) => (
    <div data-testid={`daily-${store}`}>{`${from}..${to}`}</div>
  ),
}));
vi.mock('../../../src/pages/app-insights/SyncLogTable', () => ({
  default: ({ store }: Readonly<{ store: string | null }>) => <div data-testid="sync-log" data-store={store ?? 'BOTH'} />,
}));

const renderAt = (url: string, mocks: MockedResponse[]) =>
  mount(
    <MemoryRouter initialEntries={[url]}>
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
        <AppInsightsPage />
      </MockedProvider>
    </MemoryRouter>,
  );

describe('AppInsightsPage', () => {
  it('shows what to configure — and no numbers — while no store of the tab is connected', async () => {
    await renderAt('/app-insights', [statusMock([integration({ configured: false, missing: ['reports_bucket'], status: 'DISCONNECTED' }), disconnectedApple()])]);
    await waitUntil(() => expect(queryTestId('app-insights-config-required')).not.toBeNull());

    expect(queryTestId('dashboard')).toBeNull();
    const play = byTestId('app-insights-config-google-play');
    expect(play.textContent).toContain(COPY['analytics.appInsights.field.reportsBucket']);
    expect(play.querySelector('a')?.getAttribute('href')).toBe('https://tech.example.test/?selectedtab_category=GOOGLE_PLAY');
    expect(byTestId('app-insights-config-app-store').textContent).toContain(COPY['analytics.appInsights.field.privateKey']);
    // Both status cards still say how each store stands.
    expect(byTestId('app-insights-status-app-store').textContent).toBe(COPY['analytics.appInsights.status.disconnected']);
  });

  it('opens the Overview dashboard when one store is connected, notes the other, and lists only the connected data', async () => {
    await renderAt('/app-insights', [statusMock([integration(), disconnectedApple()])]);
    await waitUntil(() => expect(queryTestId('dashboard')).not.toBeNull());

    expect(byTestId('dashboard').dataset.entity).toBe('APP_INSIGHTS');
    expect(queryTestId('app-insights-config-app-store')).not.toBeNull();
    expect(queryTestId('app-insights-config-google-play')).toBeNull();
    expect(byTestId('daily-GOOGLE_PLAY').textContent).toBe('2026-11-01..2026-11-20');
    expect(queryTestId('daily-APP_STORE')).toBeNull();
    expect(byTestId('sync-log').dataset.store).toBe('BOTH');
    expect(byTestId('app-insights-status-google-play').textContent).toBe(COPY['analytics.appInsights.status.connected']);
  });

  it('opens the tab the URL names: Google Play reads only Google Play', async () => {
    await renderAt('/app-insights?selectedtab=google-play', [statusMock([integration(), disconnectedApple()])]);
    await waitUntil(() => expect(queryTestId('dashboard')).not.toBeNull());

    expect(byTestId('dashboard').dataset.entity).toBe('APP_INSIGHTS_ANDROID');
    expect(byTestId('sync-log').dataset.store).toBe('GOOGLE_PLAY');
    expect(byTestId('app-insights-tab-google-play').getAttribute('aria-selected')).toBe('true');
  });

  it('keeps the App Store tab on its configuration state even while Google Play is connected', async () => {
    await renderAt('/app-insights?selectedtab=app-store', [statusMock([integration(), disconnectedApple()])]);
    await waitUntil(() => expect(queryTestId('app-insights-config-required')).not.toBeNull());

    expect(queryTestId('dashboard')).toBeNull();
    expect(queryTestId('app-insights-config-app-store')).not.toBeNull();
  });

  it('disables Sync now while a store is syncing', async () => {
    await renderAt('/app-insights', [
      statusMock([integration({ status: 'SYNCING' }), disconnectedApple()]),
      statusMock([integration({ status: 'SYNCING' }), disconnectedApple()]),
    ]);
    await waitUntil(() => expect(queryTestId('app-insights-sync')).not.toBeNull());
    expect(byTestId('app-insights-sync').hasAttribute('disabled')).toBe(true);
  });

  it('says the status could not be read, with a retry', async () => {
    await renderAt('/app-insights', [{ request: { query: APP_INSIGHTS_STATUS }, result: { errors: [new GraphQLError('Not allowed')] } }]);
    await waitUntil(() => expect(byTestId('app-insights-page').textContent).toContain(COPY['analytics.page.loadFailed']));
    expect(byTestId('app-insights-page').textContent).toContain('Not allowed');
    expect([...document.querySelectorAll('button')].some((b) => b.textContent === COPY['analytics.page.retry'])).toBe(true);
  });
});
