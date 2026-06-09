import { useEffect } from 'react';

import { useBrandingStore } from '@/stores/branding.store';

/**
 * Fetches the active brand (app name + logo + mascot) from the shared server
 * setting via the Zustand branding store. Cached for the session and degrades
 * gracefully: consumers fall back to the Duncit wordmark while loading/on error.
 */
export function useBranding() {
  const data = useBrandingStore((s) => s.data);
  const isLoading = useBrandingStore((s) => s.isLoading);
  const error = useBrandingStore((s) => s.error);
  const fetch = useBrandingStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error };
}
