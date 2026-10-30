import { useMemo } from 'react';
import type { NavigateFunction } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { useEntityPageMeta } from '../../app/pageMeta';
import { useLocationMismatch } from '../../hooks/useLocationMismatch';
import { usePodDetailActions } from '../pod-details-page/usePodDetailActions';
import { usePodProductSelection } from '../pod-details-page/usePodProductSelection';
import { useSmartIncentiveOffer } from '../pod-details-page/useSmartIncentiveOffer';
import {
  JOIN_POD_MEETING,
  POD_DETAILS,
  POD_ID_BY_SLUGS,
  POD_PEOPLE,
  POD_SPOT_FILLS,
  POD_ATTENDEE_SEATS,
} from '../pod-details-page/queries';

interface PodDetailsDataArgs {
  clubSlug: string;
  podSlug: string;
  referralFromUrl: string | null;
  navigate: NavigateFunction;
}

/** Every query, mutation and action hook the pod details page reads. */
export function usePodDetailsData({ clubSlug, podSlug, referralFromUrl, navigate }: PodDetailsDataArgs) {
  const slugResolution = useQuery<any>(POD_ID_BY_SLUGS, {
    variables: { clubSlug, podSlug },
    skip: !clubSlug || !podSlug,
    fetchPolicy: 'cache-and-network',
  });
  const id: string = slugResolution.data?.podBySlugs?.id ?? '';
  const { data, error, refetch } = useQuery<any>(POD_DETAILS, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const peopleIds = useMemo<string[]>(() => {
    const pod = data?.pod;
    if (!pod) return [];
    const ids = [
      ...((pod.pod_hosts_id ?? []) as string[]),
      ...((pod.pod_attendees ?? []) as string[]),
    ];
    return Array.from(new Set(ids.filter(Boolean)));
  }, [data?.pod]);
  const { data: peopleData } = useQuery<any>(POD_PEOPLE, {
    variables: { ids: peopleIds },
    skip: peopleIds.length === 0,
    fetchPolicy: 'cache-and-network',
  });
  const { data: spotFillData } = useQuery<any>(POD_SPOT_FILLS, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const { data: seatData } = useQuery<any>(POD_ATTENDEE_SEATS, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const [joinMeeting] = useMutation<any>(JOIN_POD_MEETING);
  // One face per person; the seats they hold become a label beside their name.
  const seatsByUser = useMemo(
    () =>
      Object.fromEntries(
        (seatData?.podAttendeeSeats ?? []).map((row: { user_id: string; seats: number }) => [
          row.user_id,
          row.seats,
        ]),
      ),
    [seatData],
  );
  const pod = data?.pod ?? null;
  useEntityPageMeta(pod?.pod_title);
  // A virtual pod is joined from anywhere, so its listing city is not a place
  // the viewer has to be in.
  const locationPrompt = useLocationMismatch(
    pod && pod.pod_mode !== 'VIRTUAL' ? { id: pod.location_id, zone: pod.zone_name } : null,
  );
  const productSelection = usePodProductSelection(id, pod);
  const savedIds: string[] = data?.me?.saved_pod_ids ?? [];
  const saved = pod ? savedIds.includes(pod.id) : false;
  const actions = usePodDetailActions({
    id,
    pod,
    saved,
    savedIds,
    referralFromUrl,
    refetch,
    navigate,
  });
  // Who is looking — read here, above the page's early returns, because the
  // Smart Incentive offer below needs them as much as the page does.
  const isFree = pod?.pod_type === 'FREE';
  const isPodHost = (pod?.pod_hosts_id ?? []).includes(data?.me?.user_id);
  const membershipState = data?.podMembershipState;
  // The two statuses the server's ALREADY_BOOKED check refuses a second checkout for.
  const joined = Boolean(membershipState?.is_member || membershipState?.backout_in_process);
  const smartIncentive = useSmartIncentiveOffer({ pod, isFree, isHost: isPodHost, joined });

  // The link comes back from a write that may have just marked this member
  // present, so the pod is re-read behind it — not awaited, so the tab opens
  // while the click's activation is still fresh.
  const onJoinMeeting = async (): Promise<string> => {
    const result = await joinMeeting({ variables: { id: pod?.id } });
    refetch().catch(() => undefined);
    return result.data.joinPodMeeting.meeting_url;
  };

  return {
    slugResolution,
    id,
    data,
    error,
    refetch,
    peopleData,
    spotFillData,
    onJoinMeeting,
    seatsByUser,
    pod,
    locationPrompt,
    productSelection,
    actions,
    isFree,
    isPodHost,
    joined,
    smartIncentive,
  };
}
