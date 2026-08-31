import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { resolveIconSource } from '@duncit/fallback-icons';

import { FALLBACK_ICONS } from '../fallback-icons';

const BRANDING_SUMMARY = gql`
  query AppBranding {
    branding {
      app_name
      logo_url
      portals_logo_url
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
  /** True while `logoUrl` is the bundled copy rather than the admin's URL. */
  isFallbackLogo: boolean;
  /**
   * Hand this to the `onError` of whatever renders `logoUrl`. A configured URL
   * that 404s at request time never arrives empty, so the blank-check alone
   * would leave a broken image on screen — this is what actually engages the
   * bundled copy (rule 39).
   */
  onLogoError: () => void;
}

/**
 * Returns the active branding (logo, app name) from the admin settings — the
 * portal-specific logo (Branding → 1C Portals) wins, then the global logo, then
 * the bundled fallback so a portal never renders a broken or empty logo slot
 * (rule 39).
 */
export function useBranding(): BrandingSummary {
  const { data, loading } = useQuery<any>(BRANDING_SUMMARY, { fetchPolicy: 'cache-first' });
  const [failed, setFailed] = useState(false);
  const b = data?.branding;
  const { source, isFallback } = resolveIconSource(
    b?.portals_logo_url || b?.logo_url,
    FALLBACK_ICONS.logo,
    failed,
  );
  return {
    logoUrl: source,
    appName: b?.app_name || 'Duncit',
    primaryColor: b?.primary_color,
    supportEmail: b?.support_email,
    loading: loading && !b,
    isFallbackLogo: isFallback,
    onLogoError: () => setFailed(true),
  };
}
