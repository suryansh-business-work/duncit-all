import { gql, useQuery } from '@apollo/client';

const BRANDING_ASSETS = gql`
  query BrandingAssets {
    branding {
      app_name
      logo_url
      mweb_favicon_url
      mweb_logo_url
      mweb_splash_url
      mweb_splash_type
    }
  }
`;

/**
 * mWeb's brand assets from the admin Branding setting (1A accordion): the
 * platform logo falls back to the global logo. Everything is admin-managed —
 * no bundled logo files.
 */
export function useBrandingAssets() {
  const { data, loading } = useQuery(BRANDING_ASSETS, { fetchPolicy: 'cache-first' });
  const b = data?.branding;
  return {
    loading: loading && !b,
    appName: b?.app_name || 'Duncit',
    logoUrl: b?.mweb_logo_url || b?.logo_url || '',
    faviconUrl: b?.mweb_favicon_url || '',
    splashUrl: b?.mweb_splash_url || '',
    splashType: b?.mweb_splash_type || 'IMAGE',
  };
}
