jest.mock('../../entity/entityAnalytics.service', () => ({ entityAnalyticsService: { load: jest.fn() } }));
jest.mock('@utils/app-time', () => ({
  appDate: (d: Date) => d.toISOString().slice(0, 10),
  appDateTime: (d: Date) => d.toISOString(),
}));
jest.mock('../../mail/analyticsMail.pages', () => ({
  ANALYTICS_ENTITIES: ['USERS', 'PODS', 'REVENUE'],
  ANALYTICS_MAIL_PAGES: {
    USERS: { path: '/users', copy: 'users' },
    PODS: { path: '/pods', copy: 'pods' },
    REVENUE: { path: '/revenue', copy: 'revenue' },
  },
  analyticsConsoleUrl: (path = '') => `https://console.test${path}`,
}));

import { entityAnalyticsService } from '../../entity/entityAnalytics.service';
import { buildReport, cachedBoards } from '../../mail/analyticsMail.report';

const m = (fn: unknown) => fn as jest.Mock;
const NOW = new Date('2026-03-15T00:00:00Z');
const copy = {
  locale: 'en',
  t: (key: string, vars?: Record<string, string | number>) => (vars ? `${key}|${Object.values(vars).join(',')}` : key),
};

const board = (over: Record<string, unknown> = {}) => ({
  period: { days: 30 },
  kpis: [
    { key: 'pods_held', value: 12, previous: 10, format: 'COUNT', higher_is_better: true },
    { key: 'revenue', value: 5000, previous: null, format: 'CURRENCY', higher_is_better: true },
  ],
  leaderboard: null,
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('cachedBoards', () => {
  it('reads each dashboard and period once, however many readers ask', async () => {
    m(entityAnalyticsService.load).mockResolvedValue(board());
    const load = cachedBoards();
    await Promise.all([load('PODS', 30), load('PODS', 30), load('PODS', 7), load('USERS', 30)]);
    expect(entityAnalyticsService.load).toHaveBeenCalledTimes(3);
    expect(entityAnalyticsService.load).toHaveBeenCalledWith('PODS', { days: 30 });
  });
});

describe('buildReport', () => {
  const input = (load: unknown, pages = ['REVENUE', 'PODS']) =>
    ({ title: 'Daily', pages, days: 30, copy, currency: 'Rs', load, now: NOW }) as never;

  it('orders sections like the sidebar, words each tile and links the console', async () => {
    const load = jest.fn().mockResolvedValue(board());
    const report = await buildReport(input(load));
    expect(report.sections.map((s) => s.entity)).toEqual(['PODS', 'REVENUE']);
    expect(report.sections[0]).toMatchObject({
      title: 'analytics.page.pods.title',
      url: 'https://console.test/pods',
      error: null,
      table: null,
    });
    expect(report.sections[0].kpis[0]).toMatchObject({
      title: 'analytics.kpi.podsHeld',
      value: '12',
      tone: 'good',
    });
    expect(report.sections[0].kpis[1]).toMatchObject({ value: 'Rs5,000', tone: null });
    expect(report.title).toBe('Daily');
    expect(report.url).toBe('https://console.test');
    expect(report.generated).toBe(NOW.toISOString());
    expect(report.period).toBe('email.analyticsReport.periodValue|30,2026-02-13,2026-03-15');
  });

  it('keeps the rest of the report when one dashboard cannot be read', async () => {
    const load = jest
      .fn()
      .mockRejectedValueOnce(new Error('Sonar offline'))
      .mockRejectedValueOnce('plain string failure');
    const report = await buildReport(input(load));
    expect(report.sections.map((s) => s.error)).toEqual(['Sonar offline', 'plain string failure']);
    expect(report.sections[0].kpis).toEqual([]);
  });

  it('draws a ranking of at most ten rows with outcome and value cells', async () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, name: `Row ${i}`, values: [i, i % 2] }));
    const load = jest.fn().mockResolvedValue(
      board({
        leaderboard: {
          key: 'top_clubs',
          columns: [
            { key: 'pod_count', format: 'COUNT' },
            { key: 'health_check', format: 'OUTCOME' },
          ],
          rows,
        },
      })
    );
    const report = await buildReport(input(load, ['PODS']));
    const table = report.sections[0].table;
    expect(table?.title).toBe('analytics.leaderboard.topClubs');
    expect(table?.columns).toEqual(['analytics.leaderboard.podCount', 'analytics.leaderboard.healthCheck']);
    expect(table?.rows).toHaveLength(10);
    expect(table?.rows[1]).toEqual({
      id: 'r1',
      name: 'Row 1',
      values: ['1', 'analytics.outcome.passed'],
    });
    expect(table?.rows[2].values[1]).toBe('analytics.outcome.failed');
  });

  it('ignores pages that are not known dashboards', async () => {
    const load = jest.fn().mockResolvedValue(board());
    const report = await buildReport(input(load, ['NOPE']));
    expect(report.sections).toEqual([]);
    expect(load).not.toHaveBeenCalled();
  });
});
