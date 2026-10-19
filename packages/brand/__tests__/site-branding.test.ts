import { describe, expect, it } from 'vitest';
import { SITE_BRANDING_QUERY, resolveSiteBranding, type SiteBranding } from '../src/site-branding';

const FALLBACK: SiteBranding = {
  app_name: 'Duncit',
  support_email: 'support@duncit.com',
  support_phone: '',
  website_header_logo_url: '',
  website_footer_logo_url: '',
  website_favicon_url: '',
  android_app_url: '',
  ios_app_url: '',
};

describe('resolveSiteBranding', () => {
  it('lays the saved branding over the fallback', () => {
    const saved = { ...FALLBACK, app_name: 'Duncit Pets', android_app_url: 'https://play.test/admin' };
    expect(resolveSiteBranding({ branding: saved, appVersionInfo: { android_store_url: 'https://play.test/store' } }, FALLBACK)).toEqual(saved);
  });

  it('links the store listing when Admin left the Android link blank', () => {
    const resolved = resolveSiteBranding({ branding: FALLBACK, appVersionInfo: { android_store_url: 'https://play.test/store' } }, FALLBACK);
    expect(resolved.android_app_url).toBe('https://play.test/store');
  });

  it('answers the fallback, with no Android link, when the API gave nothing', () => {
    expect(resolveSiteBranding(null, FALLBACK)).toEqual(FALLBACK);
    expect(resolveSiteBranding({ branding: FALLBACK, appVersionInfo: null }, FALLBACK).android_app_url).toBe('');
  });
});

describe('SITE_BRANDING_QUERY', () => {
  it('is the one named query asking for every branding field and the store link', () => {
    expect(SITE_BRANDING_QUERY.match(/\bquery\s+WebsiteBranding\b/g)).toHaveLength(1);
    for (const field of [...Object.keys(FALLBACK), 'android_store_url']) {
      expect(SITE_BRANDING_QUERY).toContain(field);
    }
  });
});
