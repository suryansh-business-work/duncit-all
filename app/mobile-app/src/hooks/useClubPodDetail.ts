import { useCallback, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  ClubAdminPodAttendeesDocument,
  ClubAdminPodDetailDocument,
  ClubAdminPodHostDocument,
} from '@/graphql/club-pod-details';
import { graphqlRequest } from '@/services/graphql.client';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';

/** The pod as the Club Admin's detail screen reads it, club and admins included. */
export type ClubPodDetail = NonNullable<
  ResultOf<typeof ClubAdminPodDetailDocument>['clubAdminPodForEdit']
>;

/** One person on the pod. */
export type ClubPodAttendee = ResultOf<
  typeof ClubAdminPodAttendeesDocument
>['clubAdminPodAttendees'][number];

/** One host line: who they are, plus the approved host profile when there is one. */
export interface ClubPodHostRow {
  userId: string;
  name: string;
  photo: string | null;
  email: string | null;
  phone: string | null;
  hostNo: string | null;
  status: string | null;
}

export interface ClubPodDetailState {
  pod: ClubPodDetail | null;
  attendees: ClubPodAttendee[];
  hosts: ClubPodHostRow[];
  isLoading: boolean;
  hasError: boolean;
  refetch: () => void;
}

type HostProfile = ResultOf<typeof ClubAdminPodHostDocument>['clubAdminPodHost'];

/** Host contact off the roster, keyed by user id — `host_names` drops unknown
 * users, so it can misalign with `pod_hosts_id` and the roster cannot. */
function hostRows(
  pod: ClubPodDetail | null,
  attendees: ClubPodAttendee[],
  profiles: HostProfile[],
): ClubPodHostRow[] {
  if (!pod) return [];
  const byUser = new Map(attendees.map((row) => [row.user_id, row]));
  return pod.pod_hosts_id.map((userId, index) => {
    const contact = byUser.get(userId);
    const profile = profiles[index] ?? null;
    return {
      userId,
      name: contact?.full_name ?? pod.host_names[index] ?? '',
      photo: contact?.profile_photo ?? null,
      email: profile?.email ?? contact?.email ?? null,
      phone: profile?.phone ?? contact?.phone ?? null,
      hostNo: profile?.host_no ?? null,
      status: profile?.status ?? null,
    };
  });
}

/**
 * The Club Admin's pod detail, as state.
 *
 * Every read is the club-scoped twin of an admin query, gated server-side on
 * `assertClubAdminForPod` — the same set `@duncit/pod-details` swaps in at
 * CLUB_ADMIN scope on mWeb and in the Partners console (rule 27). Payments,
 * ratings and the audit trail fetch themselves inside their own cards, exactly
 * as the MUI sections do, so a slow table never holds up the page.
 */
export function useClubPodDetail(podId: string): ClubPodDetailState {
  const [pod, setPod] = useState<ClubPodDetail | null>(null);
  const [attendees, setAttendees] = useState<ClubPodAttendee[]>([]);
  const [profiles, setProfiles] = useState<HostProfile[]>([]);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    const [detail, roster] = await Promise.all([
      graphqlRequest(ClubAdminPodDetailDocument, { pod_doc_id: podId }, { auth: true }),
      graphqlRequest(ClubAdminPodAttendeesDocument, { pod_doc_id: podId }, { auth: true }),
    ]);
    const found = detail.clubAdminPodForEdit ?? null;
    setPod(found);
    setAttendees(roster.clubAdminPodAttendees);
    // Scoped to the pod, one call per host: a club admin may read the host
    // running THEIR pod, never look up an arbitrary host by id.
    const hostProfiles = await Promise.all(
      (found?.pod_hosts_id ?? []).map((user_id) =>
        graphqlRequest(
          ClubAdminPodHostDocument,
          { pod_doc_id: podId, user_id },
          { auth: true },
        ).then((res) => res.clubAdminPodHost),
      ),
    );
    setProfiles(hostProfiles);
    setHasError(false);
  }, [podId]);

  const { isLoading, refetch } = useReloadableQuery(load, {
    enabled: Boolean(podId),
    onError: () => setHasError(true),
  });

  const hosts = useMemo(() => hostRows(pod, attendees, profiles), [pod, attendees, profiles]);

  return { pod, attendees, hosts, isLoading, hasError, refetch };
}
