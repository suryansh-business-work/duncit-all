import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import DailyDataTable from '../../../src/pages/app-insights/DailyDataTable';
import SyncLogTable from '../../../src/pages/app-insights/SyncLogTable';
import { APP_INSIGHTS_DAILY, APP_INSIGHTS_SYNC_LOGS } from '../../../src/pages/app-insights/queries';
import { byTestId, click, mount, queryTestId, waitUntil } from '../../dom';
import { COPY } from '../../mocks/analytics';
import { dailyRow, syncLog } from '../../mocks/app-insights';

vi.mock('@duncit/table', () => import('../../mocks/table'));

const range = { from: '2026-11-01', to: '2026-11-20' };
const daily = (store: 'GOOGLE_PLAY' | 'APP_STORE', dimension: string, rows: unknown[]): MockedResponse => ({
  request: { query: APP_INSIGHTS_DAILY, variables: { store, ...range, dimension } },
  result: { data: { appInsightsDaily: rows } },
});
const withApollo = (ui: ReactElement, mocks: MockedResponse[]) =>
  mount(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      {ui}
    </MockedProvider>,
  );
const headers = () => [...byTestId('table-headers').querySelectorAll('span')].map((s) => s.textContent);

describe('DailyDataTable', () => {
  it("shows Google Play's own columns over the dashboard period", async () => {
    await withApollo(<DailyDataTable store="GOOGLE_PLAY" {...range} />, [daily('GOOGLE_PLAY', 'TOTAL', [dailyRow()])]);
    await waitUntil(() => expect(document.querySelectorAll('[data-testid="table-row"]')).toHaveLength(1));
    expect(headers()).toEqual(
      expect.arrayContaining([COPY['analytics.appInsights.col.newInstalls'], COPY['analytics.appInsights.col.anrs']])
    );
    expect(headers()).not.toContain(COPY['analytics.appInsights.col.firstDownloads']);
    expect(headers()).not.toContain(COPY['analytics.appInsights.col.country']);
    expect(byTestId('app-insights-daily-google-play').textContent).toContain(COPY['analytics.appInsights.store.googlePlay']);
  });

  it('splits by country on request — a new read, with the country column', async () => {
    await withApollo(<DailyDataTable store="GOOGLE_PLAY" {...range} />, [
      daily('GOOGLE_PLAY', 'TOTAL', [dailyRow()]),
      daily('GOOGLE_PLAY', 'COUNTRY', [dailyRow({ id: 'c1', dimension: 'COUNTRY', key: 'IN' }), dailyRow({ id: 'c2', dimension: 'COUNTRY', key: 'US' })]),
    ]);
    await waitUntil(() => expect(document.querySelectorAll('[data-testid="table-row"]')).toHaveLength(1));
    await click(byTestId('app-insights-dimension-country'));
    await waitUntil(() => expect(document.querySelectorAll('[data-testid="table-row"]')).toHaveLength(2));
    expect(headers()).toContain(COPY['analytics.appInsights.col.country']);
  });

  it("shows the App Store's own columns, and says when there are no stored days", async () => {
    await withApollo(<DailyDataTable store="APP_STORE" {...range} />, [daily('APP_STORE', 'TOTAL', [])]);
    await waitUntil(() => expect(queryTestId('table-empty')?.textContent).toBe(COPY['analytics.appInsights.daily.empty']));
    expect(headers()).toContain(COPY['analytics.appInsights.col.firstDownloads']);
    expect(headers()).not.toContain(COPY['analytics.appInsights.col.anrs']);
  });

  it('says why the read failed', async () => {
    await withApollo(<DailyDataTable store="APP_STORE" {...range} />, [
      { request: { query: APP_INSIGHTS_DAILY, variables: { store: 'APP_STORE', ...range, dimension: 'TOTAL' } }, result: { errors: [new GraphQLError('A range can cover at most a year.')] } },
    ]);
    await waitUntil(() => expect(byTestId('app-insights-daily-app-store').textContent).toContain('A range can cover at most a year.'));
  });
});

describe('SyncLogTable', () => {
  const logs = (store: string | null, rows: unknown[]): MockedResponse => ({
    request: { query: APP_INSIGHTS_SYNC_LOGS, variables: { store, limit: 100 } },
    result: { data: { appInsightsSyncLogs: rows } },
  });

  it('lists each sync with its store, trigger, outcome, duration and message', async () => {
    await withApollo(<SyncLogTable store={null} />, [
      logs(null, [syncLog(), syncLog({ id: 'log2', store: 'APP_STORE', trigger: 'MANUAL', outcome: 'FAILED', duration_ms: null, message: 'HTTP 403' })]),
    ]);
    await waitUntil(() => expect(document.querySelectorAll('[data-testid="table-row"]')).toHaveLength(2));
    const text = byTestId('app-insights-sync-log').textContent ?? '';
    expect(text).toContain(COPY['analytics.appInsights.log.success']);
    expect(text).toContain(COPY['analytics.appInsights.log.failed']);
    expect(text).toContain(COPY['analytics.appInsights.log.manual']);
    expect(text).toContain(COPY['analytics.appInsights.store.appStore']);
    expect(text).toContain('HTTP 403');
  });

  it('says there have been no syncs yet', async () => {
    await withApollo(<SyncLogTable store="GOOGLE_PLAY" />, [logs('GOOGLE_PLAY', [])]);
    await waitUntil(() => expect(queryTestId('table-empty')?.textContent).toBe(COPY['analytics.appInsights.log.empty']));
  });
});
