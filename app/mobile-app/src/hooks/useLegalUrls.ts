import { auth } from '@duncit/auth-tokens';

import { useBranding } from './useBranding';

/**
 * The admin Branding Terms & Privacy pages — what every terms link in the app
 * opens (mWeb reads the same pair from useBrandingAssets). The shared auth
 * tokens carry the same defaults, so a link works before that query answers.
 */
export function useLegalUrls() {
  const branding = useBranding().data?.branding;
  return {
    termsUrl: branding?.terms_url || auth.legal.termsUrl,
    privacyUrl: branding?.privacy_url || auth.legal.privacyUrl,
  };
}
