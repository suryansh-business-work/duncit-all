import { useEffect } from 'react';

import { useFeatureFlagsStore } from '@/stores/feature-flags.store';

/**
 * Reads a server feature flag by key (RN twin of mWeb's useFeatureFlag).
 * Returns `defaultValue` while loading or when the flag is absent. Triggers the
 * one-shot cached fetch on first use.
 */
export function useFeatureFlag(key: string, defaultValue = false): boolean {
  const data = useFeatureFlagsStore((s) => s.data);
  const fetch = useFeatureFlagsStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const flag = (data?.publicFeatureFlags ?? []).find((item) => item.key === key);
  if (!flag) return defaultValue;
  return flag.enabled === true;
}
