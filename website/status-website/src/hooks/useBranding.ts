import { useEffect, useState } from 'react';
import { fetchBranding } from '../api';

export interface BrandingState {
  appName: string;
  logoUrl: string;
  primaryColor: string | null;
}

const DEFAULT_BRANDING: BrandingState = {
  appName: 'Duncit',
  logoUrl: '/duncit-logo.svg',
  primaryColor: null,
};

/** Live brand from admin settings, falling back to the bundled logo/name. */
export function useBranding(): BrandingState {
  const [branding, setBranding] = useState<BrandingState>(DEFAULT_BRANDING);

  useEffect(() => {
    const ctrl = new AbortController();
    const load = async () => {
      try {
        const remote = await fetchBranding(ctrl.signal);
        if (!remote) return;
        setBranding({
          appName: remote.app_name || DEFAULT_BRANDING.appName,
          logoUrl: remote.logo_url || DEFAULT_BRANDING.logoUrl,
          primaryColor: remote.primary_color || null,
        });
      } catch {
        /* keep the static fallback logo/name */
      }
    };
    load().catch(() => undefined);
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    document.title = `${branding.appName} Status`;
  }, [branding.appName]);

  return branding;
}
