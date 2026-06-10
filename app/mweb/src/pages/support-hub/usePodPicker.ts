import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { MY_ACTIVE_SUPPORT_PODS, type SupportPodOption } from './queries';

const DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000;

interface MembershipNode {
  id: string;
  pod: {
    id: string;
    pod_id: string;
    pod_title: string;
    pod_date_time: string;
    pod_end_date_time: string | null;
  } | null;
}

// Every pod the user has joined, ordered so the most relevant for live support
// comes first: still-active or upcoming pods (soonest first), then ended pods
// (most recently ended first). Kept in sync with mobile's filterSupportPods.
export function usePodPicker() {
  const { data, loading } = useQuery<{ myPodMemberships: MembershipNode[] }>(
    MY_ACTIVE_SUPPORT_PODS,
    { fetchPolicy: 'cache-and-network' }
  );

  const options = useMemo<SupportPodOption[]>(() => {
    const now = Date.now();
    return (data?.myPodMemberships ?? [])
      .filter((m) => !!m.pod)
      .map((m) => {
        const pod = m.pod!;
        const start = new Date(pod.pod_date_time).getTime();
        const end = pod.pod_end_date_time
          ? new Date(pod.pod_end_date_time).getTime()
          : start + DEFAULT_DURATION_MS;
        return { membershipId: m.id, pod, start, end };
      })
      .sort((a, b) => {
        const aEnded = now > a.end;
        const bEnded = now > b.end;
        if (aEnded !== bEnded) return aEnded ? 1 : -1;
        return aEnded ? b.end - a.end : a.start - b.start;
      })
      .map(({ membershipId, pod, start, end }) => ({
        membershipId,
        podDocId: pod.id,
        podSlug: pod.pod_id,
        title: pod.pod_title,
        startsAt: new Date(start).toISOString(),
        endsAt: pod.pod_end_date_time ? new Date(end).toISOString() : null,
      }));
  }, [data]);

  const [selectedId, setSelectedId] = useState<string>('');
  useEffect(() => {
    if (!options.length) {
      if (selectedId) setSelectedId('');
      return;
    }
    if (!selectedId || !options.some((o) => o.podDocId === selectedId)) {
      setSelectedId(options[0].podDocId);
    }
  }, [options, selectedId]);

  const selected = options.find((o) => o.podDocId === selectedId) ?? null;
  return { options, selected, selectedId, setSelectedId, loading };
}
