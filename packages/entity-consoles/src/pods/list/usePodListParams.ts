import { useSearchParams } from 'react-router';
import { POD_LIFECYCLE_OPTIONS, type PodLifecycleFilter } from './podLifecycle';

/** A `?lifecycle=` value the status select offers, or `''` (every stage) for anything else. */
export const parseLifecycle = (raw: string | null): PodLifecycleFilter =>
  POD_LIFECYCLE_OPTIONS.find((option) => option.value === raw)?.value ?? '';

/**
 * All Pods' URL-driven filters. The club and the lifecycle stage live in the
 * query string so a link — the brief's tiles open `/pods?lifecycle=UPCOMING` —
 * lands on an already-filtered list, and changing one keeps the other.
 */
export default function usePodListParams() {
  const [params, setParams] = useSearchParams();

  const update = (key: string, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });

  return {
    clubFilter: params.get('club_id') ?? '',
    // Bookmarks from before the editor became a page still point at /pods?edit=.
    legacyEditId: params.get('edit') ?? '',
    lifecycle: parseLifecycle(params.get('lifecycle')),
    setClubFilter: (club: string) => update('club_id', club),
    setLifecycle: (lifecycle: PodLifecycleFilter) => update('lifecycle', lifecycle),
  };
}
