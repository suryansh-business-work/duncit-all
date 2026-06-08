import { settingsService } from '../../settings.service';
import { FeatureFlagModel } from '../../settings.model';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';

describe('settingsService integration', () => {
  it('creates the app-settings singleton and updates formats', async () => {
    const initial = await settingsService.getAppSettings();
    expect(initial.date_format).toBeTruthy();

    const updated = await settingsService.updateAppSettings({ date_format: 'yyyy-MM-dd' });
    expect(updated.date_format).toBe('yyyy-MM-dd');

    const pub = await settingsService.getPublicAppSettings();
    expect(pub.date_format).toBe('yyyy-MM-dd');
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
});
