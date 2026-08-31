import { useQuery } from '@apollo/client/react';
import { AUTO_POD_ACTION_COUNTS } from '@duncit/auto-pods';
import type { AutoPodActionCounts } from '@duncit/utils';
import { useFeatureFlag } from './useFeatureFlag';

/** Roles that can have an Auto Pod waiting on them. A pure consumer holds none
 * of these, so the query never leaves their device. */
const PARTNER_ROLES = new Set(['HOST', 'VENUE_OWNER', 'CLUB_ADMIN']);

export interface AutoPodCountsState {
  /** null until the counts are in — callers then fall back to the static home. */
  counts: AutoPodActionCounts | null;
  /** Re-reads the counts; called as the role switcher opens. */
  reload: () => void;
}

/**
 * Per-role Auto Pod counts, fetched EAGERLY wherever the role switcher lives.
 *
 * The switch itself must not wait on a network round trip — it decides where to
 * land from whatever is already cached — so this mounts with the header rather
 * than inside the switch dialog, and only refreshes when the dialog opens.
 */
export function useAutoPodCounts(roles: readonly string[]): AutoPodCountsState {
  const enabled = useFeatureFlag('auto_pods');
  const isPartner = roles.some((role) => PARTNER_ROLES.has(role));
  const active = enabled && isPartner;

  const { data, refetch } = useQuery<{ myAutoPodActionCounts: AutoPodActionCounts }>(
    AUTO_POD_ACTION_COUNTS,
    { fetchPolicy: 'cache-and-network', skip: !active }
  );

  return {
    counts: data?.myAutoPodActionCounts ?? null,
    reload: () => {
      if (!active) return;
      refetch().catch(() => undefined);
    },
  };
}
