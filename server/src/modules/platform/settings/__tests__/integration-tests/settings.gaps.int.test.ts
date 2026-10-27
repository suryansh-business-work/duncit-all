/**
 * The settings corners the main suites leave out, against a real database:
 * the numbers an admin can mistype, the knobs read before anyone has saved
 * anything, flags that do not exist, the "All" tab layout without a position,
 * the version sync, and the cached clock settings.
 */
import { Types } from 'mongoose';
import * as appTime from '@utils/app-time';
import { AppSettingsModel } from '../../settings.model';
import { settingsService as service } from '../../settings.service';

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.APP_VERSION;
});

describe('numbers an admin can mistype fall back to their defaults', () => {
  it('uses the default backout attempts for zero, a non-number and a fraction below one', async () => {
    await service.updateAppSettings({ max_backout_attempts: 0 });
    expect((await service.getPublicAppSettings()).max_backout_attempts).toBe(3);
    await service.updateAppSettings({ max_backout_attempts: Number.NaN });
    expect((await service.getPublicAppSettings()).max_backout_attempts).toBe(3);
    await service.updateAppSettings({ max_backout_attempts: 4.9 });
    expect((await service.getPublicAppSettings()).max_backout_attempts).toBe(4);
  });

  it('uses the default auto-cancel lead for zero, and clamps one that is past a year', async () => {
    await service.updateAppSettings({ pod_auto_cancel_lead_hours: 0 });
    expect((await service.getPodAutoCancelSettings()).lead_hours).toBe(24);
    await service.updateAppSettings({ pod_auto_cancel_lead_hours: 99999 });
    expect((await service.getPodAutoCancelSettings()).lead_hours).toBe(8760);
    await service.updateAppSettings({ pod_auto_cancel_lead_hours: 48 });
    expect((await service.getPodAutoCancelSettings()).lead_hours).toBe(48);
  });
});

describe('a form field that was cleared', () => {
  it('serves the public settings as the documented defaults, never as nulls a non-null field would choke on', async () => {
    await service.getPublicAppSettings();
    const raw = await AppSettingsModel.collection.findOne({ singleton_key: 'app' });
    const keep = new Set(['_id', 'singleton_key', 'created_at', 'updated_at', '__v']);
    await AppSettingsModel.collection.updateOne({ singleton_key: 'app' }, { $set: Object.fromEntries(Object.keys(raw ?? {}).filter((k) => !keep.has(k)).map((k) => [k, null])) });
    expect(await service.getPublicAppSettings()).toMatchObject({
      date_format: 'dd MMM yyyy', time_format: 'hh:mm a', time_zone: 'Asia/Kolkata', time_source: 'SERVER', min_signup_age: 18,
      draft_retention_days: 3, max_backout_attempts: 3, venue_cancel_health_penalty: 5, attendance_otp_required: true, custom_time: null,
    });
  });

  it('serves a flag whose description was cleared with a blank one', async () => {
    const flag = await service.createFlag({ key: 'clear_me', name: 'Clear me', description: 'text' });
    const out = await service.updateFlag(flag!.id, { description: null as never });
    expect(out?.description).toBe('');
  });
});

describe('before anyone has saved a setting', () => {
  it('holds cancellation refunds by default off and keeps the auto-cancel sweep off', async () => {
    expect(await AppSettingsModel.countDocuments()).toBe(0);
    await expect(service.getPodCancelRefundHold()).resolves.toBe(false);
    await expect(service.getPodAutoCancelSettings()).resolves.toMatchObject({ enabled: false, lead_hours: 24 });
  });

  it('reads what was saved once it has been', async () => {
    await service.updateAppSettings({ pod_cancel_refund_hold: true, pod_auto_cancel_enabled: true });
    await expect(service.getPodCancelRefundHold()).resolves.toBe(true);
    await expect(service.getPodAutoCancelSettings()).resolves.toMatchObject({ enabled: true });
  });

  it('hands the clock settings nothing to cache, then the stored zone and patterns', async () => {
    const set = jest.spyOn(appTime, 'setAppTimeSettings').mockImplementation(() => undefined);
    await service.refreshDerivedCaches();
    expect(set).toHaveBeenLastCalledWith({ time_zone: null, date_format: null, time_format: null });
    await service.updateAppSettings({ time_zone: 'Asia/Dubai', date_format: 'yyyy-MM-dd' });
    set.mockClear();
    await service.refreshDerivedCaches();
    expect(set).toHaveBeenLastCalledWith({ time_zone: 'Asia/Dubai', date_format: 'yyyy-MM-dd', time_format: 'hh:mm a' });
  });
});

describe('the single-purpose readers', () => {
  it('answer the defaults before anything is saved, and what an admin saved once it is', async () => {
    expect(await service.getPodCompletionSettings()).toEqual({ timeout_hours: expect.any(Number), reminder_hours: expect.any(Number) });
    expect(await service.getChangeRequestHealthPenalties()).toEqual({ VENUE: 5, HOST: 5, CLUB_ADMIN: 5 });
    expect(await service.getMaxBackoutAttempts()).toBe(3);
    expect(await service.getCheckoutNudgeMinutes()).toEqual(expect.any(Number));
    await service.updateAppSettings({
      pod_complete_timeout_hours: 36, pod_complete_reminder_hours: 6, checkout_nudge_minutes: 15, max_backout_attempts: 4,
      venue_change_request_health_penalty: 7, host_change_request_health_penalty: 0, club_admin_change_request_health_penalty: 99,
    });
    expect(await service.getPodCompletionSettings()).toEqual({ timeout_hours: 36, reminder_hours: 6 });
    expect(await service.getChangeRequestHealthPenalties()).toEqual({ VENUE: 7, HOST: 0, CLUB_ADMIN: 10 });
    expect(await service.getMaxBackoutAttempts()).toBe(4);
    expect(await service.getCheckoutNudgeMinutes()).toBe(15);
  });
});

describe('feature flags that do not exist', () => {
  it('answers null for a missing key, and says NOT_FOUND changing, switching or deleting a missing flag', async () => {
    await expect(service.getFlag('nope')).resolves.toBeNull();
    const id = String(new Types.ObjectId());
    await expect(service.updateFlag(id, { name: 'x' })).rejects.toMatchObject({ message: 'FeatureFlag not found', extensions: { code: 'NOT_FOUND' } });
    await expect(service.setFlagEnabled(id, true)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(service.deleteFlag(id)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });

  it('reads the key case-insensitively and gives a flag without a description a blank one', async () => {
    const created = await service.createFlag({ key: 'Case_Flag', name: 'Case' });
    expect(created).toMatchObject({ key: 'case_flag', description: '', enabled: false });
    expect((await service.getFlag('CASE_FLAG'))?.id).toBe(created?.id);
    expect(created?.created_at).toEqual(expect.any(String));
  });
});

describe('the "All" tab layout without a position', () => {
  it('defaults to the top when no position, or a null one, is given', async () => {
    const none = await service.updateBranding({ home_all_vibe_icon_layout: { width: 60, height: 70 } });
    expect(none.home_all_vibe_icon_layout).toEqual({ position: 'TOP', width: 60, height: 70 });
    const nulled = await service.updateBranding({ home_all_vibe_icon_layout: { position: null, width: null, height: null } });
    expect(nulled.home_all_vibe_icon_layout).toEqual({ position: 'TOP', width: 40, height: 40 });
  });
});

describe('the pod shop slider and the occasion icons', () => {
  it('trims what an admin typed, defaults a missing order to its place and a null text to blank', async () => {
    const slider = await service.updatePodShopSlider([
      { url: 'https://img/a.jpg', heading: ' Big sale ', subheading: null, cta_label: undefined, cta_url: ' /shop ' },
      { url: 'https://img/b.mp4', type: 'VIDEO', order: 9 },
    ]);
    expect(slider).toEqual([
      { url: 'https://img/a.jpg', type: 'IMAGE', order: 0, heading: 'Big sale', subheading: '', cta_label: '', cta_url: '/shop' },
      { url: 'https://img/b.mp4', type: 'VIDEO', order: 9, heading: '', subheading: '', cta_label: '', cta_url: '' },
    ]);
  });

  it('keeps a window with a usable slug and dates, defaults the rest, and drops a blank slug or a reversed range', async () => {
    const icons = await service.updateOccasionalIcons([
      { slug: ' Diwali ', starts_at: '2026-10-20T00:00:00Z', ends_at: '2026-10-25T00:00:00Z' },
      { slug: '  ', starts_at: '2026-10-20T00:00:00Z', ends_at: '2026-10-25T00:00:00Z' },
      { slug: 'backwards', starts_at: '2026-10-25T00:00:00Z', ends_at: '2026-10-20T00:00:00Z' },
      { slug: 'garbled', starts_at: 'not a date', ends_at: '2026-10-25T00:00:00Z' },
    ]);
    expect(icons).toHaveLength(1);
    expect(icons[0]).toMatchObject({ slug: 'diwali', label: '', icon_url: '', fallback_icon: 'occasion', is_active: true, sort_order: 0 });
    expect(icons[0].starts_at).toBe('2026-10-20T00:00:00.000Z');
  });
});

describe('the version sync', () => {
  it('does nothing when the deploy supplied no version, and records one when it did', async () => {
    await service.applyEnvVersion();
    expect((await service.getAppVersionInfo()).latest_version).toBe('');
    process.env.APP_VERSION = ' 4.2.0 ';
    await service.applyEnvVersion();
    expect(await service.getAppVersionInfo()).toMatchObject({ latest_version: '4.2.0', min_supported_version: '', ios_store_url: '' });
  });
});

describe('the public client config', () => {
  it('gives every value as text, blank when the environment holds none', async () => {
    const config = await service.getPublicClientConfig();
    for (const value of Object.values(config)) expect(typeof value).toBe('string');
    expect(config.apple_relay_url).toMatch(/\/apple\/callback$/);
  });
});
