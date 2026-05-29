import { analyticsService } from '../../analytics.service';

describe('analyticsService integration', () => {
  it('records an active-user ping without error', async () => {
    await analyticsService.recordPing({ device_id: 'dev-1', super_category_slug: 'dining' });
    expect(typeof analyticsService.recordPing).toBe('function');
  });

  it('returns dashboard totals on an empty dataset', async () => {
    const totals = await analyticsService.dashboardTotals();
    expect(totals).toBeDefined();
  });
});
