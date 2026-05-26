import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { MY_ACTIVE_BOUNCER_PODS, type BouncerPodOption } from './queries';

const UPCOMING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const GRACE_AFTER_END_MS = 6 * 60 * 60 * 1000;

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

// Returns pods the user has actively joined and that are either upcoming
// (within 7 days) or still inside a 6-hour grace window after they ended —
// i.e. the pods where Bouncers tools are realistically relevant.
export function usePodPicker() {
  const { data, loading } = useQuery<{ myPodMemberships: MembershipNode[] }>(
    MY_ACTIVE_BOUNCER_PODS,
    { fetchPolicy: 'cache-and-network' }
  );

  const options = useMemo<BouncerPodOption[]>(() => {
    const now = Date.now();
    return (data?.myPodMemberships ?? [])
      .filter((m) => !!m.pod)
      .map((m) => {
        const pod = m.pod!;
        const start = new Date(pod.pod_date_time).getTime();
        const end = pod.pod_end_date_time
          ? new Date(pod.pod_end_date_time).getTime()
          : start + 4 * 60 * 60 * 1000;
        return { membershipId: m.id, pod, start, end };
      })
      .filter(({ start, end }) => {
        if (now < start) return start - now <= UPCOMING_WINDOW_MS;
        return now <= end + GRACE_AFTER_END_MS;
      })
      .sort((a, b) => a.start - b.start)
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
