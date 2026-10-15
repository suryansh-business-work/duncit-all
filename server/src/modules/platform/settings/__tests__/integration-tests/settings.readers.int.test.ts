/**
 * The clamped single-value readers the rest of the server gates on (signup age,
 * ticket discount cap, the reminder sweep clocks), the flag import that moves
 * flags between environments, and the branding writes that validate before
 * storing (legal links, theme colours, login backdrops, launch page media).
 */
import { GraphQLError } from 'graphql';

import { settingsService } from '../../settings.service';
import { AppSettingsModel, BrandingModel, FeatureFlagModel } from '../../settings.model';

async function rejectionOf(run: () => Promise<unknown>): Promise<GraphQLError> {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(GraphQLError);
    return error as GraphQLError;
  }
  throw new Error('expected a rejection');
}

/** Writes straight to the stored singleton, past the clamps, as an old or hand-edited row would be. */
const storeRaw = async (fields: Record<string, unknown>) => {
  await settingsService.getAppSettings();
  await AppSettingsModel.collection.updateOne({ singleton_key: 'app' }, { $set: fields });
};

describe('getReminderSweepSettings', () => {
  it('serves the documented defaults before the settings exist', async () => {
    expect(await settingsService.getReminderSweepSettings()).toEqual({
      pod_reminder_lead_hours: 24,
      venue_slot_reminder_lead_hours: 48,
      pod_feedback_delay_hours: 1,
      complete_reminder_hours: 12,
      complete_timeout_hours: 24,
    });
  });

  it('reads every saved clock in one go, and clamps a stored value out of range', async () => {
    await settingsService.updateAppSettings({
      pod_reminder_lead_hours: 6,
      venue_slot_reminder_lead_hours: 36,
      pod_feedback_delay_hours: 0,
      pod_complete_reminder_hours: 8,
      pod_complete_timeout_hours: 30,
    });
    expect(await settingsService.getReminderSweepSettings()).toEqual({
      pod_reminder_lead_hours: 6,
      venue_slot_reminder_lead_hours: 36,
      // 0 is a legal delay: feedback asked for the moment the pod ends.
      pod_feedback_delay_hours: 0,
      complete_reminder_hours: 8,
      complete_timeout_hours: 30,
    });

    await AppSettingsModel.collection.updateOne(
      { singleton_key: 'app' },
      { $set: { pod_reminder_lead_hours: 99_999, venue_slot_reminder_lead_hours: 0 } }
    );
    const clamped = await settingsService.getReminderSweepSettings();
    expect(clamped.pod_reminder_lead_hours).toBe(8760);
    expect(clamped.venue_slot_reminder_lead_hours).toBe(48);
  });
});

describe('minimum signup age', () => {
  it('defaults to 18 before anything is saved', async () => {
    expect(await settingsService.getMinSignupAge()).toBe(18);
  });

  it('clamps a save to 1–120, floors a fraction and treats 0 as unset', async () => {
    expect((await settingsService.updateAppSettings({ min_signup_age: 200 })).min_signup_age).toBe(120);
    expect(await settingsService.getMinSignupAge()).toBe(120);
    expect((await settingsService.updateAppSettings({ min_signup_age: 0 })).min_signup_age).toBe(18);
    expect((await settingsService.updateAppSettings({ min_signup_age: 16.7 })).min_signup_age).toBe(16);
    expect(await settingsService.getMinSignupAge()).toBe(16);
  });

  it('never serves a stored age below 1', async () => {
    await storeRaw({ min_signup_age: -4 });
    expect(await settingsService.getMinSignupAge()).toBe(1);
  });
});

describe('draft retention days', () => {
  it('keeps at least a day, floors fractions and treats 0 as unset', async () => {
    expect((await settingsService.updateAppSettings({ draft_retention_days: 2.9 })).draft_retention_days).toBe(2);
    expect((await settingsService.updateAppSettings({ draft_retention_days: 0 })).draft_retention_days).toBe(3);
    expect((await settingsService.updateAppSettings({ draft_retention_days: -7 })).draft_retention_days).toBe(1);
  });
});

describe('getTicketDiscountMaxPct', () => {
  it('defaults to 50% before anything is saved', async () => {
    expect(await settingsService.getTicketDiscountMaxPct()).toBe(50);
  });

  it('clamps to 1–99% so a tier can never make a ticket free', async () => {
    await settingsService.updateAppSettings({ ticket_discount_max_pct: 150 });
    expect(await settingsService.getTicketDiscountMaxPct()).toBe(99);

    await storeRaw({ ticket_discount_max_pct: -5 });
    expect(await settingsService.getTicketDiscountMaxPct()).toBe(1);

    await storeRaw({ ticket_discount_max_pct: 0 });
    expect(await settingsService.getTicketDiscountMaxPct()).toBe(50);
  });
});

describe('importFlags', () => {
  it('updates known keys in place, creates new ones and skips rows without a key or name', async () => {
    const existing = await settingsService.createFlag({ key: 'beta_x', name: 'Beta X', enabled: false });

    const result = await settingsService.importFlags([
      { key: ' Beta_X ', name: ' Beta X renamed ', description: 'moved', enabled: true },
      { key: 'NEW_ONE', name: 'New one', enabled: null },
      { key: '', name: 'No key' },
      { key: 'no_name', name: '   ' },
    ]);

    expect(result).toEqual({ created: ['new_one'], updated: ['beta_x'], skipped: ['(no key)', 'no_name'] });

    const updated = await FeatureFlagModel.findById(existing?.id).lean();
    expect(updated).toMatchObject({ key: 'beta_x', name: 'Beta X renamed', description: 'moved', enabled: true });
    const created = await FeatureFlagModel.findOne({ key: 'new_one' }).lean();
    expect(created).toMatchObject({ name: 'New one', description: '', enabled: false });
    expect(await FeatureFlagModel.countDocuments({ key: 'no_name' })).toBe(0);
  });

  it('does nothing for an empty file', async () => {
    expect(await settingsService.importFlags([])).toEqual({ created: [], updated: [], skipped: [] });
    expect(await FeatureFlagModel.countDocuments()).toBe(0);
  });
});

describe('updateBranding validation', () => {
  it('refuses a legal link that is not a web address and stores nothing', async () => {
    const terms = await rejectionOf(() => settingsService.updateBranding({ terms_url: 'ftp://duncit.test/terms', app_name: 'X' }));
    expect(terms.message).toBe('Terms & Conditions URL must start with https:// (or http://)');
    expect(terms.extensions.code).toBe('BAD_USER_INPUT');

    const privacy = await rejectionOf(() => settingsService.updateBranding({ privacy_url: 'duncit.test/privacy' }));
    expect(privacy.message).toBe('Privacy Policy URL must start with https:// (or http://)');
    expect(await BrandingModel.countDocuments()).toBe(0);
  });

  it('stores theme colours per mode and names the bad cell of an invalid one', async () => {
    const saved = await settingsService.updateBranding({
      theme_token_source: 'SERVER',
      theme_tokens_light: { primary: ' #112233 ', bg: null },
      theme_tokens_dark: { primary: 'rgba(0, 0, 0, 0.5)' },
    });
    expect(saved.theme_token_source).toBe('SERVER');
    expect(saved.theme_tokens_light).toMatchObject({ primary: '#112233', bg: '' });
    expect(saved.theme_tokens_dark).toMatchObject({ primary: 'rgba(0, 0, 0, 0.5)' });

    const bad = await rejectionOf(() => settingsService.updateBranding({ theme_tokens_dark: { primary: 'blue' } }));
    expect(bad.message).toBe('Theme token dark.primary is not a valid colour: "blue"');
    expect((await settingsService.getBranding()).theme_tokens_dark.primary).toBe('rgba(0, 0, 0, 0.5)');
  });

  it('switches the login backdrops on and off independently', async () => {
    const on = await settingsService.updateBranding({
      login_background_image_enabled: true,
      login_background_video_enabled: false,
    });
    expect(on).toMatchObject({ login_background_image_enabled: true, login_background_video_enabled: false });

    const flipped = await settingsService.updateBranding({ login_background_video_enabled: true });
    expect(flipped).toMatchObject({ login_background_image_enabled: true, login_background_video_enabled: true });
  });

  it('replaces the launch page media whole, trimmed, and clears it on null', async () => {
    const saved = await settingsService.updateBranding({
      launch_media: { hero_video_url: ' https://cdn.duncit.test/hero.mp4 ', host_image_url: 'https://cdn.duncit.test/h.jpg' },
    });
    expect(saved.launch_media).toMatchObject({
      hero_video_url: 'https://cdn.duncit.test/hero.mp4',
      host_image_url: 'https://cdn.duncit.test/h.jpg',
      venue_video_url: '',
    });

    const cleared = await settingsService.updateBranding({ launch_media: null });
    expect(Object.values(cleared.launch_media).every((value) => value === '')).toBe(true);
  });

  it('refuses launch media that is not a web address', async () => {
    await settingsService.updateBranding({ launch_media: { hero_image_url: 'https://cdn.duncit.test/a.jpg' } });

    const err = await rejectionOf(() => settingsService.updateBranding({ launch_media: { hero_image_url: 'not a url' } }));

    expect(err.extensions.code).toBe('BAD_USER_INPUT');
    expect((await settingsService.getBranding()).launch_media.hero_image_url).toBe('https://cdn.duncit.test/a.jpg');
  });
});
