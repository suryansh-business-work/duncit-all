import { useEffect } from 'react';

import { useFeatureFlagsStore } from '@/stores/feature-flags.store';

/**
 * The server's public flag list, or undefined until it has loaded. Triggers
 * the one-shot cached fetch on first use (RN twin of mWeb's).
 */
export function usePublicFeatureFlags() {
  const data = useFeatureFlagsStore((s) => s.data);
  const fetch = useFeatureFlagsStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return data?.publicFeatureFlags;
}

/**
 * Reads a server feature flag by key (RN twin of mWeb's useFeatureFlag).
 * Returns `defaultValue` while loading or when the flag is absent.
 */
export function useFeatureFlag(key: string, defaultValue = false): boolean {
  const flag = (usePublicFeatureFlags() ?? []).find((item) => item.key === key);
  if (!flag) return defaultValue;
  return flag.enabled === true;
}
