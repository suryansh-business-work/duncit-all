import { settingsService } from '../../settings.service';
import { settingsResolvers } from '../../settings.resolver';
import { FeatureFlagModel } from '../../settings.model';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { makeContext } from '@test/harness';
import {
  getReopenWindowZone,
  setReopenWindowZone,
  DEFAULT_REOPEN_ZONE,
} from '@modules/support/reopenWindow';

describe('settingsService integration', () => {
  afterEach(() => setReopenWindowZone(DEFAULT_REOPEN_ZONE));

  it('creates the app-settings singleton and updates formats', async () => {
    const initial = await settingsService.getAppSettings();
    expect(initial.date_format).toBeTruthy();
    expect(initial.time_zone).toBe('Asia/Kolkata');

    const updated = await settingsService.updateAppSettings({ date_format: 'yyyy-MM-dd' });
    expect(updated.date_format).toBe('yyyy-MM-dd');

    const pub = await settingsService.getPublicAppSettings();
    expect(pub.date_format).toBe('yyyy-MM-dd');
    expect(pub.time_zone).toBe('Asia/Kolkata');
  });

  it('updates the timezone and re-aligns the reopen-window day boundary', async () => {
    const updated = await settingsService.updateAppSettings({ time_zone: 'America/New_York' });
    expect(updated.time_zone).toBe('America/New_York');
    expect(getReopenWindowZone()).toBe('America/New_York');

    const pub = await settingsService.getPublicAppSettings();
    expect(pub.time_zone).toBe('America/New_York');
  });

  it('refreshes the cached reopen-window zone from the persisted setting on boot', async () => {
    await settingsService.updateAppSettings({ time_zone: 'Europe/London' });
    setReopenWindowZone(DEFAULT_REOPEN_ZONE); // simulate a fresh process
    await settingsService.refreshDerivedCaches();
    expect(getReopenWindowZone()).toBe('Europe/London');
  });

  it('runs the full feature-flag lifecycle', async () => {
    const created = await settingsService.createFlag({ key: 'New_Flag', name: 'New Flag', enabled: false });
    expect(created!.key).toBe('new_flag');

    await expect(settingsService.createFlag({ key: 'new_flag', name: 'dup' })).rejects.toThrow(/exists/i);

    expect((await settingsService.getFlag('new_flag'))?.name).toBe('New Flag');

    const enabled = await settingsService.setFlagEnabled(created!.id, true);
    expect(enabled!.enabled).toBe(true);

    const renamed = await settingsService.updateFlag(created!.id, { name: 'Renamed' });
    expect(renamed!.name).toBe('Renamed');

    expect(await settingsService.deleteFlag(created!.id)).toBe(true);
  });

  it('protects system flags from deletion', async () => {
    await settingsService.seedDefaults();
    const sys = await FeatureFlagModel.findOne({ is_system: true });
    await expect(settingsService.deleteFlag(String(sys!._id))).rejects.toThrow(/system flag cannot be deleted/i);
  });

  it('reads and updates branding', async () => {
    const branding = await settingsService.getBranding();
    expect(branding.app_name).toBe('Duncit');

    const updated = await settingsService.updateBranding({ support_phone: '+911234567890' });
    expect(updated.support_phone).toBe('+911234567890');
  });

  it('replaces and reads back the pod shop slider media (backfilling order + video type)', async () => {
    const initial = await settingsService.getBranding();
    expect(initial.pod_shop_slider).toEqual([]);

    const saved = await settingsService.updatePodShopSlider([
      { url: 'https://cdn/a.jpg', type: 'IMAGE', order: 0 },
      { url: 'https://cdn/b.mp4', type: 'VIDEO' }, // order backfilled from position
    ]);
    expect(saved).toEqual([
      { url: 'https://cdn/a.jpg', type: 'IMAGE', order: 0 },
      { url: 'https://cdn/b.mp4', type: 'VIDEO', order: 1 },
    ]);

    // Persisted onto the public branding read the buyer apps consume.
    const branding = await settingsService.getBranding();
    expect(branding.pod_shop_slider).toEqual(saved);
  });

  it('lets a slider-write admin replace the slider through the mutation resolver', async () => {
    const result = await (settingsResolvers.Mutation as any).updatePodShopSlider(
      {},
      { input: [{ url: 'https://cdn/x.jpg', type: 'IMAGE', order: 0 }] },
      makeContext({ roles: ['SUPER_ADMIN'] })
    );
    expect(result).toEqual([{ url: 'https://cdn/x.jpg', type: 'IMAGE', order: 0 }]);
  });

  it('serves app version info and syncs the latest version from APP_VERSION', async () => {
    // Store URL falls back to the default Play Store URL when unset.
    const before = await settingsService.getAppVersionInfo();
    expect(before.latest_version).toBe('');
    expect(before.android_store_url).toContain('play.google.com');

    // applyEnvVersion upserts the DB latest version from the env (deploy path).
    const original = process.env.APP_VERSION;
    process.env.APP_VERSION = '2.4.1';
    await settingsService.applyEnvVersion();
    const after = await settingsService.getAppVersionInfo();
    expect(after.latest_version).toBe('2.4.1');

    // Empty env is a no-op (keeps the existing value).
    process.env.APP_VERSION = '';
    await settingsService.applyEnvVersion();
    expect((await settingsService.getAppVersionInfo()).latest_version).toBe('2.4.1');

    // An explicit admin-set store URL overrides the default.
    await settingsService.updateBranding({ android_app_url: 'https://play.google.com/store/apps/details?id=x' });
    expect((await settingsService.getAppVersionInfo()).android_store_url).toBe(
      'https://play.google.com/store/apps/details?id=x'
    );
    process.env.APP_VERSION = original;
  });

  it('exposes public client config from the active default env entries (Tech portal)', async () => {
    await EnvEntryModel.create({
      name: 'web',
      category: 'GOOGLE_OAUTH',
      is_active: true,
      is_default: true,
      config: { client_id: 'web-client.apps.googleusercontent.com', client_secret: 'x' },
    });
    await EnvEntryModel.create({
      name: 'maps',
      category: 'GOOGLE_MAPS',
      is_active: true,
      is_default: true,
      config: { maps_api_key: 'maps-key-123' },
    });
    const cfg = await settingsService.getPublicClientConfig();
    expect(cfg.google_client_id).toBe('web-client.apps.googleusercontent.com');
    expect(cfg.google_maps_api_key).toBe('maps-key-123');
  });

  it('seeds default flags idempotently and exposes public flags', async () => {
    await settingsService.seedDefaults();
    await settingsService.seedDefaults();
    const flags = await settingsService.listPublicFlags();
    expect(flags.length).toBeGreaterThanOrEqual(6);
    expect(flags.every((f) => typeof f.enabled === 'boolean')).toBe(true);
  });

  it('serves the featureFlagsTable page with search, filters, sort and paging', async () => {
    await settingsService.seedDefaults();
    await settingsService.createFlag({
      key: 'zz_custom',
      name: 'ZZ Custom',
      description: 'a bespoke toggle',
      enabled: true,
    });

    // Default sort matches listFlags (key asc) and the envelope reports clamps.
    const all = await settingsService.flagsTable();
    expect(all.total).toBe((await settingsService.listFlags()).length);
    expect(all.rows[all.rows.length - 1]!.key).toBe('zz_custom');
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans key, name and description.
    const byKey = await settingsService.flagsTable({ search: 'zz_' });
    expect(byKey.rows.map((f) => f!.key)).toEqual(['zz_custom']);
    const byDescription = await settingsService.flagsTable({ search: 'bespoke' });
    expect(byDescription.rows.map((f) => f!.key)).toEqual(['zz_custom']);

    // Boolean filters narrow.
    const custom = await settingsService.flagsTable({
      filters: [{ field: 'is_system', op: 'is_false' }],
    });
    expect(custom.rows.map((f) => f!.key)).toEqual(['zz_custom']);
    const enabled = await settingsService.flagsTable({
      filters: [{ field: 'enabled', op: 'is_true' }],
    });
    expect(enabled.rows.some((f) => f!.key === 'zz_custom')).toBe(true);
    expect(enabled.rows.every((f) => f!.enabled)).toBe(true);

    // Allowlisted sort, descending.
    const desc = await settingsService.flagsTable({ sort_by: 'key', sort_dir: 'desc' });
    expect(desc.rows[0]!.key).toBe('zz_custom');

    // Paging keeps total and reports the clamped page/page_size back.
    const page2 = await settingsService.flagsTable({ page: 2, page_size: 2 });
    expect(page2.rows).toHaveLength(2);
    expect(page2.total).toBe(all.total);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(2);
  });
});
