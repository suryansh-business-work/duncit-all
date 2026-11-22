/**
 * Minimum Advance Days for Pod Creation (Pod Settings): 2 by default, 1–30.
 */
import { settingsService } from '../../settings.service';
import { AppSettingsModel } from '../../settings.model';

describe('Minimum Advance Days for Pod Creation', () => {
  it('is 2 days on a fresh install', async () => {
    await expect(settingsService.getPodMinAdvanceDays()).resolves.toBe(2);
    await expect(settingsService.getAppSettings()).resolves.toMatchObject({ pod_min_advance_days: 2 });
  });

  it('is saved by an admin and read back by the create-pod rule', async () => {
    await expect(settingsService.updateAppSettings({ pod_min_advance_days: 5 })).resolves.toMatchObject({
      pod_min_advance_days: 5,
    });
    await expect(settingsService.getPodMinAdvanceDays()).resolves.toBe(5);
  });

  it.each([
    [0, 1],
    [-4, 1],
    [31, 30],
    [500, 30],
    [7.8, 7],
  ])('holds %p to %p', async (input, saved) => {
    await settingsService.updateAppSettings({ pod_min_advance_days: input });
    await expect(settingsService.getPodMinAdvanceDays()).resolves.toBe(saved);
  });

  it('falls back to 2 for a value that is not a number', async () => {
    await settingsService.updateAppSettings({ pod_min_advance_days: 9 });
    await settingsService.updateAppSettings({ pod_min_advance_days: 'soon' as never });
    await expect(settingsService.getPodMinAdvanceDays()).resolves.toBe(2);
  });

  it('reads a stored value written outside the service through the same range', async () => {
    await AppSettingsModel.collection.updateOne({ singleton_key: 'app' }, { $set: { pod_min_advance_days: 90 } }, { upsert: true });
    await expect(settingsService.getPodMinAdvanceDays()).resolves.toBe(30);
  });

  it('leaves the other pod settings untouched when saved alone', async () => {
    await settingsService.updateAppSettings({ venue_offer_max_counters: 8 });
    await settingsService.updateAppSettings({ pod_min_advance_days: 3 });
    await expect(settingsService.getAppSettings()).resolves.toMatchObject({ venue_offer_max_counters: 8, pod_min_advance_days: 3 });
  });
});
