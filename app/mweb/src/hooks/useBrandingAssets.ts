import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const BRANDING_ASSETS = gql`
  query BrandingAssets {
    branding {
      app_name
      logo_url
      mweb_favicon_url
      mweb_logo_url
      mweb_splash_url
      mweb_splash_type
      venues_card_video_url
      login_background_image_enabled
      login_background_image_url
      login_background_video_enabled
      login_background_video_url
    }
  }
`;

/**
 * mWeb's brand assets from the admin Branding setting (1A accordion): the
 * platform logo falls back to the global logo. Everything is admin-managed —
 * no bundled logo files.
 */
export function useBrandingAssets() {
  const { data, loading } = useQuery<any>(BRANDING_ASSETS, { fetchPolicy: 'cache-first' });
  const b = data?.branding;
  return {
    loading: loading && !b,
    appName: b?.app_name || 'Duncit',
    logoUrl: b?.mweb_logo_url || b?.logo_url || '',
    faviconUrl: b?.mweb_favicon_url || '',
    splashUrl: b?.mweb_splash_url || '',
    splashType: b?.mweb_splash_type || 'IMAGE',
    venuesCardVideoUrl: b?.venues_card_video_url || '',
    /*
      A backdrop is its switch AND its asset: an admin who turns one off
      keeps the URL they picked, so the URL alone must never draw anything.
      Video first — it is the richer of the two, and an admin who set both
      up went to more trouble for that one.
    */
    loginBackgroundVideoUrl: b?.login_background_video_enabled ? b?.login_background_video_url || '' : '',
    loginBackgroundImageUrl: b?.login_background_image_enabled ? b?.login_background_image_url || '' : '',
  };
}
