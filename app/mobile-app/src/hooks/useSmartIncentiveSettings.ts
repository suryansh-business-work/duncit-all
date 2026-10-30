import { useEffect } from 'react';
import {
  DEFAULT_SMART_INCENTIVE_DELAY_SECONDS,
  DEFAULT_SMART_INCENTIVE_MAX_PCT,
} from '@duncit/utils';

import { useSmartIncentiveSettingsStore } from '@/stores/smart-incentive-settings.store';

/**
 * Loyalty > Smart Incentive's settings for the host's editors. Until they load
 * (or when they cannot) the programme reads as off, so no editor offers a
 * switch the server may not honour; the delay and the maximum stand in with
 * the shared defaults meanwhile.
 */
export function useSmartIncentiveSettings() {
  const settings = useSmartIncentiveSettingsStore((s) => s.data?.smartIncentiveSettings);
  const fetch = useSmartIncentiveSettingsStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    /** The programme's switch — every editor hides itself while it is off. */
    enabled: settings?.enabled ?? false,
    delaySeconds: settings?.delay_seconds ?? DEFAULT_SMART_INCENTIVE_DELAY_SECONDS,
    maxPct: settings?.max_discount_pct ?? DEFAULT_SMART_INCENTIVE_MAX_PCT,
  };
}
