import { useEffect, useMemo } from 'react';

import { useHomeStore } from '@/stores/home.store';
import type { HomePod } from '@/hooks/useHomeFeed';

const MAX_RESULTS = 20;

const placeText = (pod: HomePod) =>
  [pod.place_label, pod.place_detail].filter(Boolean).join(' ').toLowerCase();

/** Matches a pod against the query on its title or place text. */
function matchesQuery(pod: HomePod, q: string): boolean {
  return pod.pod_title.toLowerCase().includes(q) || placeText(pod).includes(q);
}

/**
 * Title/place search over the active home feed (the store already holds every
 * active pod), powering the header search screen. Mirrors mWeb's pod search —
 * an empty query returns nothing so the screen shows its prompt.
 */
export function usePodSearch(query: string) {
  const data = useHomeStore((s) => s.data);
  const isLoading = useHomeStore((s) => s.isLoading);
  const fetch = useHomeStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const trimmed = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!trimmed) return [];
    return (data?.pods ?? []).filter((pod) => matchesQuery(pod, trimmed)).slice(0, MAX_RESULTS);
  }, [data, trimmed]);

  return { results, isLoading, hasQuery: trimmed.length > 0 };
}
