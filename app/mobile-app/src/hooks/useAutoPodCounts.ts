import { useEffect } from 'react';
import type { AutoPodActionCounts } from '@duncit/utils';

import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useAutoPodCountsStore } from '@/stores/auto-pod-counts.store';

/** Roles that can have an Auto Pod waiting on them. A pure consumer holds none
 * of these, so the query never leaves their phone. */
const PARTNER_ROLES = new Set(['HOST', 'VENUE_OWNER', 'CLUB_ADMIN']);

export interface AutoPodCountsState {
  /** Undefined until the counts are in — the switch then lands on the mode's home. */
  counts: AutoPodActionCounts | undefined;
  /** Re-reads the counts; called as the role switcher opens. */
  reload: () => void;
}

/**
 * Per-role Auto Pod counts for the role switch — the RN twin of mWeb's
 * useAutoPodCounts (rule 27).
 *
 * Read once per session, and only for an account that can have one waiting:
 * the header and the drawer both used to prime it on mount for everyone. It is
 * re-read when the switch dialog opens, which is the one moment it decides
 * something.
 */
export function useAutoPodCounts(roles: readonly string[]): AutoPodCountsState {
  const enabled = useFeatureFlag('auto_pods');
  const active = enabled && roles.some((role) => PARTNER_ROLES.has(role));
  const counts = useAutoPodCountsStore((s) => s.data);
  const fetch = useAutoPodCountsStore((s) => s.fetch);

  useEffect(() => {
    if (active) fetch().catch(() => undefined);
  }, [active, fetch]);

  return {
    counts,
    reload: () => {
      if (active) fetch(true).catch(() => undefined);
    },
  };
}
