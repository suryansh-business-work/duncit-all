/**
 * The branding every Duncit website bakes in at build time (Admin > Branding,
 * Website Logos). Each site still sends the query through its own build-time
 * client and keeps its own fallback; the query, its shape and the Android
 * fallback live here once.
 */
export interface SiteBranding {
  app_name: string;
  support_email: string;
  support_phone: string;
  website_header_logo_url: string;
  website_footer_logo_url: string;
  website_favicon_url: string;
  android_app_url: string;
  ios_app_url: string;
}

/** Public app listings used when a website's Admin branding has no store URL. */
export const DUNCIT_ANDROID_APP_URL = 'https://play.google.com/store/apps/details?id=com.duncit.mobile';
export const DUNCIT_IOS_APP_URL = 'https://apps.apple.com/in/app/duncit/id6813361552';

/** What {@link SITE_BRANDING_QUERY} answers. */
export interface SiteBrandingData {
  branding: SiteBranding;
  appVersionInfo?: { android_store_url: string } | null;
}

export const SITE_BRANDING_QUERY = `
  query WebsiteBranding {
    branding {
      app_name
      support_email
      support_phone
      website_header_logo_url
      website_footer_logo_url
      website_favicon_url
      android_app_url
      ios_app_url
    }
    appVersionInfo {
      android_store_url
    }
  }
`;

/**
 * The answer laid over the site's fallback. Blank store URLs in Admin >
 * Branding fall back to the public listings, so download bands link the app.
 */
export function resolveSiteBranding(data: SiteBrandingData | null, fallback: SiteBranding): SiteBranding {
  const branding = { ...fallback, ...data?.branding };
  return {
    ...branding,
    android_app_url: branding.android_app_url || data?.appVersionInfo?.android_store_url || DUNCIT_ANDROID_APP_URL,
    ios_app_url: branding.ios_app_url || DUNCIT_IOS_APP_URL,
  };
}
