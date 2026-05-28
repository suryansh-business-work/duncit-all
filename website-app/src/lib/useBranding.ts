import { gql, useQuery } from '@apollo/client';

const BRANDING_SUMMARY = gql`
  query AppBranding {
    branding {
      app_name
      logo_url
      primary_color
      support_email
    }
  }
`;

export interface BrandingSummary {
  logoUrl: string;
  appName: string;
  primaryColor?: string;
  supportEmail?: string;
  loading: boolean;
}

/**
 * Returns the active branding (logo, app name) from the admin settings.
 * Falls back to the bundled SVG until the dynamic logo loads so the UI never
 * shows an empty image.
 */
export function useBranding(): BrandingSummary {
  const { data, loading } = useQuery(BRANDING_SUMMARY, { fetchPolicy: 'cache-first' });
  const b = data?.branding;
  return {
    logoUrl: b?.logo_url || '/duncit-logo.svg',
    appName: b?.app_name || 'Duncit',
    primaryColor: b?.primary_color,
    supportEmail: b?.support_email,
    loading: loading && !b,
  };
}
