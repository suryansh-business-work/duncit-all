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

  it('defaults the time source to SERVER and stamps every public read with server_time', async () => {
    const pub = await settingsService.getPublicAppSettings();
    expect(pub.time_source).toBe('SERVER');
    expect(pub.custom_time).toBeNull();
    expect(pub.custom_time_set_at).toBeNull();
    // server_time is the server's clock at response time — clients tick from it.
    expect(Math.abs(Date.parse(pub.server_time) - Date.now())).toBeLessThan(60_000);
  });

  it('stamps custom_time_set_at when a custom anchor is saved, and clears both on null', async () => {
    const before = Date.now();
    const saved = await settingsService.updateAppSettings({
      time_source: 'CUSTOM',
      custom_time: '2030-06-15T10:00:00.000Z',
    });
    expect(saved.time_source).toBe('CUSTOM');
    expect(saved.custom_time).toBe('2030-06-15T10:00:00.000Z');
    // The save-stamp is the SERVER's real clock, not the anchor.
    expect(Date.parse(saved.custom_time_set_at as string)).toBeGreaterThanOrEqual(before);

    // An unusable anchor is rejected rather than stored as Invalid Date.
    const junk = await settingsService.updateAppSettings({ custom_time: 'not-a-date' });
    expect(junk.custom_time).toBeNull();
    expect(junk.custom_time_set_at).toBeNull();

    // Clearing the anchor clears its stamp too.
    await settingsService.updateAppSettings({ custom_time: '2030-06-15T10:00:00.000Z' });
    const cleared = await settingsService.updateAppSettings({ custom_time: null });
    expect(cleared.custom_time).toBeNull();
    expect(cleared.custom_time_set_at).toBeNull();

    await settingsService.updateAppSettings({ time_source: 'SERVER' });
  });

  it('replaces occasional icons, normalising slugs and dropping unusable rows', async () => {
    const saved = await settingsService.updateOccasionalIcons([
      {
        slug: '  Diwali ',
        label: 'Diwali',
        starts_at: '2026-11-05T00:00:00.000Z',
        ends_at: '2026-11-12T00:00:00.000Z',
        icon_url: ' https://cdn/diwali.png ',
      },
      // Dropped: no slug.
      { slug: '   ', starts_at: '2026-01-01T00:00:00.000Z', ends_at: '2026-01-02T00:00:00.000Z' },
      // Dropped: unusable dates.
      { slug: 'junk', starts_at: 'not-a-date', ends_at: '2026-01-02T00:00:00.000Z' },
      // Dropped: window ends before it starts.
      { slug: 'backwards', starts_at: '2026-05-02T00:00:00.000Z', ends_at: '2026-05-01T00:00:00.000Z' },
    ]);

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      slug: 'diwali', // trimmed + lowercased so it matches the native asset folder
      label: 'Diwali',
      icon_url: 'https://cdn/diwali.png',
      is_active: true,
      sort_order: 0,
    });

    // Readable from the public branding query the apps use.
    const branding = await settingsService.getBranding();
    expect(branding.occasional_icons).toEqual(saved);

    // Replacing with an empty list clears them.
    expect(await settingsService.updateOccasionalIcons([])).toEqual([]);
  });

  it('binds a fallback-icon name, defaulting when the admin sets none', async () => {
    const saved = await settingsService.updateOccasionalIcons([
      {
        slug: 'holi',
        starts_at: '2027-03-01T00:00:00.000Z',
        ends_at: '2027-03-05T00:00:00.000Z',
        fallback_icon: '  All-Vibe ',
      },
      {
        slug: 'unbound',
        starts_at: '2027-04-01T00:00:00.000Z',
        ends_at: '2027-04-05T00:00:00.000Z',
      },
    ]);

    // Stored normalised; the canonical NAME list is the client package's, so an
    // unrecognised value is kept here and resolved by the app, not rejected.
    expect(saved[0].fallback_icon).toBe('all-vibe');
    expect(saved[1].fallback_icon).toBe('occasion');
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
    // Home vibe tabber defaults to only-categories-with-pods.
    expect(branding.home_show_all_vibe_categories).toBe(false);

    const updated = await settingsService.updateBranding({ support_phone: '+911234567890' });
    expect(updated.support_phone).toBe('+911234567890');

    // The show-all-categories toggle round-trips as a boolean.
    const toggled = await settingsService.updateBranding({ home_show_all_vibe_categories: true });
    expect(toggled.home_show_all_vibe_categories).toBe(true);
    expect((await settingsService.getBranding()).home_show_all_vibe_categories).toBe(true);
  });

  it('normalises and clears the "All" tab icon layout', async () => {
    // Default: no layout.
    expect((await settingsService.getBranding()).home_all_vibe_icon_layout).toBeNull();

    // Valid position kept; size clamped (>200 → 200, <1 → 1).
    const set = await settingsService.updateBranding({
      home_all_vibe_icon_layout: { position: 'LEFT', width: 300, height: -5 },
    });
    expect(set.home_all_vibe_icon_layout).toEqual({ position: 'LEFT', width: 200, height: 1 });

    // Invalid position → TOP; 0 size → default 40.
    const fixed = await settingsService.updateBranding({
      home_all_vibe_icon_layout: { position: 'DIAGONAL', width: 0, height: 40 },
    });
    expect(fixed.home_all_vibe_icon_layout).toEqual({ position: 'TOP', width: 40, height: 40 });

    // null clears it.
    const cleared = await settingsService.updateBranding({ home_all_vibe_icon_layout: null });
    expect(cleared.home_all_vibe_icon_layout).toBeNull();
  });

  it('replaces and reads back the pod shop slider media (backfilling order + video type)', async () => {
    const initial = await settingsService.getBranding();
    expect(initial.pod_shop_slider).toEqual([]);

    const saved = await settingsService.updatePodShopSlider([
      {
        url: 'https://cdn/a.jpg',
        type: 'IMAGE',
        order: 0,
        heading: '  Gear Up  ', // trimmed
        subheading: 'Top picks',
        cta_label: 'Shop Now',
        cta_url: '/shop',
      },
      { url: 'https://cdn/b.mp4', type: 'VIDEO' }, // order backfilled, copy fields default to ''
    ]);
    expect(saved).toEqual([
      {
        url: 'https://cdn/a.jpg',
        type: 'IMAGE',
        order: 0,
        heading: 'Gear Up',
        subheading: 'Top picks',
        cta_label: 'Shop Now',
        cta_url: '/shop',
      },
      {
        url: 'https://cdn/b.mp4',
        type: 'VIDEO',
        order: 1,
        heading: '',
        subheading: '',
        cta_label: '',
        cta_url: '',
      },
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
    expect(result).toEqual([
      {
        url: 'https://cdn/x.jpg',
        type: 'IMAGE',
        order: 0,
        heading: '',
        subheading: '',
        cta_label: '',
        cta_url: '',
      },
    ]);
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
    // The native force-update screen is gated on this flag, so it ships ON —
    // adding the toggle must not silently stop enforcing updates.
    expect(flags.find((f) => f.key === 'force_app_update')?.enabled).toBe(true);
  });

  it('leaves an operator-disabled force_app_update alone on the next boot', async () => {
    await settingsService.seedDefaults();
    const flag = await settingsService.getFlag('force_app_update');
    await settingsService.setFlagEnabled(flag!.id, false);
    // $setOnInsert only — re-seeding must never revive a flag Tech turned off.
    await settingsService.seedDefaults();
    expect((await settingsService.getFlag('force_app_update'))?.enabled).toBe(false);
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
