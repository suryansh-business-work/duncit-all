import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import EntityAnalyticsPage from '../../../src/pages/entity-analytics/EntityAnalyticsPage';
import { ENTITY_ANALYTICS } from '../../../src/pages/entity-analytics/queries';
import type { AnalyticsPageSpec } from '../../../src/pages/entity-analytics/pages';
import type { PeriodState } from '../../../src/pages/entity-analytics/period-state';
import { byTestId, mount, queryTestId, waitUntil } from '../../dom';
import { board } from '../../mocks/analytics';

vi.mock('@duncit/dashboard', () => ({
  DuncitDashboard: ({ header }: Readonly<{ header: ReactNode }>) => <div data-testid="dashboard">{header}</div>,
}));

const PAGE: AnalyticsPageSpec = {
  path: '/app-insights',
  entity: 'APP_INSIGHTS',
  title: 'analytics.page.appInsights.title',
  subtitle: 'analytics.page.appInsights.subtitle',
  dashboardId: 'analytics.appInsights',
};

const answer: MockedResponse = {
  request: { query: ENTITY_ANALYTICS, variables: { entity: 'APP_INSIGHTS', compare: 'PREVIOUS', city: null, platform: null, days: 30 } },
  result: { data: { entityAnalytics: { ...board(), entity: 'APP_INSIGHTS' } } },
};

describe('EntityAnalyticsPage slots', () => {
  it('puts a page’s own strip under the heading, its actions beside the period, and its footer under the grid with the period on screen', async () => {
    const footer = vi.fn((period: PeriodState) => <div data-testid="footer">{period.days}</div>);
    await mount(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[answer]}>
        <EntityAnalyticsPage
          page={PAGE}
          intro={<div data-testid="intro" />}
          actions={<button data-testid="action" type="button" />}
          footer={footer}
        />
      </MockedProvider>,
    );
    await waitUntil(() => expect(queryTestId('dashboard')).not.toBeNull());
    expect(byTestId('dashboard').contains(byTestId('intro'))).toBe(true);
    expect(byTestId('dashboard').contains(byTestId('action'))).toBe(true);
    expect(byTestId('dashboard').contains(byTestId('footer'))).toBe(false);
    expect(byTestId('footer').textContent).toBe('30');
  });

  it('renders no footer while the numbers are loading', async () => {
    const footer = vi.fn(() => <div data-testid="footer" />);
    // The answer is held back, so the page is still loading when it is read —
    // with no delay it could land inside mount() and the footer would rightly show.
    await mount(
      <MockedProvider mockLinkDefaultOptions={{ delay: 60_000 }} mocks={[answer]}>
        <EntityAnalyticsPage page={PAGE} footer={footer} />
      </MockedProvider>,
    );
    expect(queryTestId('loader')).not.toBeNull();
    expect(queryTestId('footer')).toBeNull();
    expect(footer).not.toHaveBeenCalled();
  });
});
