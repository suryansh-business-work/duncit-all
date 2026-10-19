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
 * The answer laid over the site's fallback. A blank Android link in Admin >
 * Branding falls back to the server's store listing, so the download band
 * links the live app instead of saying "soon".
 */
export function resolveSiteBranding(data: SiteBrandingData | null, fallback: SiteBranding): SiteBranding {
  const branding = { ...fallback, ...data?.branding };
  return { ...branding, android_app_url: branding.android_app_url || data?.appVersionInfo?.android_store_url || '' };
}
