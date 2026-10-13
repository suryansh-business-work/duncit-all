import { settingsService } from '../../settings.service';
import { AppSettingsModel, BrandingModel } from '../../settings.model';

const KEEP = new Set(['_id', 'singleton_key', 'created_at', 'updated_at', '__v']);

/** Stores an explicit null in every field of the singleton, the way a cleared form field does. */
async function nullEverything(model: typeof AppSettingsModel | typeof BrandingModel, key: string) {
  const raw = await model.collection.findOne({ singleton_key: key });
  const nulls = Object.fromEntries(Object.keys(raw ?? {}).filter((k) => !KEEP.has(k)).map((k) => [k, null]));
  await model.collection.updateOne({ singleton_key: key }, { $set: nulls });
}

const withoutStamp = <T extends Record<string, unknown>>(o: T) => {
  const { updated_at: _u, ...rest } = o;
  return rest;
};

describe('app settings with every field cleared', () => {
  it('serves the same values as a fresh install, except the JWT lifetime which stays unset', async () => {
    const fresh = await settingsService.getAppSettings();
    await nullEverything(AppSettingsModel, 'app');
    const cleared = await settingsService.getAppSettings();
    expect(withoutStamp(cleared as never)).toEqual(withoutStamp({ ...fresh, jwt_expires_in: null } as never));
  });

  it('falls back to the documented defaults for the formats and switches', async () => {
    await settingsService.getAppSettings();
    await nullEverything(AppSettingsModel, 'app');
    const s = await settingsService.getAppSettings();
    expect(s).toMatchObject({
      date_format: 'dd MMM yyyy',
      time_format: 'hh:mm a',
      time_source: 'SERVER',
      custom_time: null,
      custom_time_set_at: null,
      attendance_otp_required: true,
      pod_cancel_refund_hold: false,
      pod_auto_cancel_enabled: false,
    });
    expect(s.min_signup_age).toBeGreaterThanOrEqual(1);
    expect(s.max_backout_attempts).toBeGreaterThanOrEqual(1);
    expect(s.draft_retention_days).toBeGreaterThanOrEqual(1);
  });
});

describe('branding with every field cleared', () => {
  it('serves blanks, the built-in defaults and the default legal links', async () => {
    const fresh = await settingsService.getBranding();
    await nullEverything(BrandingModel, 'branding');
    const cleared = await settingsService.getBranding();
    expect(cleared).toMatchObject({
      app_name: 'Duncit',
      primary_color: '#1976d2',
      logo_url: '',
      mweb_splash_type: 'IMAGE',
      mobile_splash_type: 'IMAGE',
      portals_splash_type: 'IMAGE',
      home_header_tagline: 'It All Starts Here!',
      login_background_image_enabled: false,
      home_show_all_vibe_categories: false,
      pod_shop_slider: [],
      occasional_icons: [],
      home_all_vibe_icon_layout: null,
    });
    expect(cleared.terms_url).toBe(fresh.terms_url);
    expect(cleared.privacy_url).toBe(fresh.privacy_url);
    expect(cleared.venues_card_video_url).toBe(fresh.venues_card_video_url);
    expect(cleared.theme_token_source).toBe(fresh.theme_token_source);
  });

  it('fills the missing parts of slider entries and occasion icons', async () => {
    await settingsService.getBranding();
    await BrandingModel.collection.updateOne(
      { singleton_key: 'branding' },
      {
        $set: {
          pod_shop_slider: [{ url: 'https://img/a.jpg' }],
          occasional_icons: [{ is_active: false }, { slug: 'diwali', label: 'Diwali' }],
        },
      }
    );
    const b = await settingsService.getBranding();
    expect(b.pod_shop_slider).toEqual([
      { url: 'https://img/a.jpg', type: 'IMAGE', order: 0, heading: '', subheading: '', cta_label: '', cta_url: '' },
    ]);
    expect(b.occasional_icons[0]).toMatchObject({ slug: '', label: '', is_active: false, fallback_icon: 'occasion', sort_order: 0 });
    expect(b.occasional_icons[1]).toMatchObject({ slug: 'diwali', label: 'Diwali', is_active: true, starts_at: '', ends_at: '' });
  });
});
