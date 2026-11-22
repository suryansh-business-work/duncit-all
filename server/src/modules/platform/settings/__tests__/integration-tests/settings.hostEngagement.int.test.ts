/**
 * Pod Settings > Host engagement & performance, saved through the real
 * service: defaults, clamps, and a status list whose keys survive every save.
 */
import { settingsService } from '../../settings.service';

describe('Host engagement & performance settings', () => {
  it('starts on the defaults with notifications off', async () => {
    await expect(settingsService.getAppSettings()).resolves.toMatchObject({
      host_inactivity_days: 14,
      host_monthly_pod_target: 8,
      host_performance_notify_enabled: false,
      host_performance_notify_day: 1,
      host_underperform_threshold_pct: 100,
    });
    const s = await settingsService.getHostEngagementSettings();
    expect(s.statuses.map((row) => row.key)).toContain('NOT_RESPONDING');
  });

  it('saves and clamps the numbers', async () => {
    await settingsService.updateAppSettings({
      host_inactivity_days: 200,
      host_monthly_pod_target: 12,
      host_performance_notify_day: 31,
      host_underperform_threshold_pct: 75,
      host_performance_notify_enabled: true,
    });
    await expect(settingsService.getHostEngagementSettings()).resolves.toMatchObject({
      inactivity_days: 90,
      monthly_pod_target: 12,
      notify_day: 28,
      underperform_threshold_pct: 75,
      notify_enabled: true,
    });
  });

  it('keeps a removed status key, switched off, across saves', async () => {
    await settingsService.updateAppSettings({
      host_engagement_statuses: [
        { key: 'NOT_CONTACTED', label: 'Fresh', is_active: true },
        { label: 'Needs a venue', is_active: true },
      ],
    });
    const { statuses } = await settingsService.getHostEngagementSettings();
    expect(statuses[0]).toEqual({ key: 'NOT_CONTACTED', label: 'Fresh', is_active: true });
    expect(statuses[1]).toEqual({ key: 'NEEDS_A_VENUE', label: 'Needs a venue', is_active: true });
    expect(statuses.find((row) => row.key === 'CONTACTED')?.is_active).toBe(false);
  });

  it('refuses a list with nothing active and leaves the stored list as it was', async () => {
    const before = (await settingsService.getHostEngagementSettings()).statuses;
    await expect(
      settingsService.updateAppSettings({
        host_engagement_statuses: before.map((row) => ({ ...row, is_active: false })),
      }),
    ).rejects.toThrow(/At least one status/);
    await expect(settingsService.getHostEngagementSettings()).resolves.toMatchObject({ statuses: before });
  });
});
