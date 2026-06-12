import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  AddPodCommentDocument,
  ClubDetailsDocument,
  DeletePodCommentDocument,
  PodCommentsDocument,
  PodDetailsDocument,
  PodPeopleDocument,
} from '@/graphql/details';
import { TogglePodLikeDocument, ToggleSavedPodDocument } from '@/graphql/explore';
import { graphqlRequest } from '@/services/graphql.client';

export type PodComment = ResultOf<typeof PodCommentsDocument>['podComments'][number];
type PodDetailsResult = ResultOf<typeof PodDetailsDocument>;
export type PodDetail = NonNullable<PodDetailsResult['pod']>;
export type PodVenue = PodDetailsResult['publicVenues'][number];
export type PodLocation = PodDetailsResult['locations'][number];
export type PodMembershipState = PodDetailsResult['podMembershipState'];
export type PodPerson = ResultOf<typeof PodPeopleDocument>['publicUsersByIds'][number];
type ClubDetailsResult = ResultOf<typeof ClubDetailsDocument>;
export type ClubDetail = NonNullable<ClubDetailsResult['club']>;
export type ClubPod = ClubDetailsResult['pods'][number];

/** Fetches a single pod (auth) plus the venue/location it resolves to (for the
 * map + "Where") and the viewer id (for comments). Saved set rides along too. */
export function usePodDetails(podId: string) {
  const [pod, setPod] = useState<PodDetail | null>(null);
  const [venue, setVenue] = useState<PodVenue | null>(null);
  const [location, setLocation] = useState<PodLocation | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [savedInitially, setSavedInitially] = useState(false);
  const [membershipState, setMembershipState] = useState<PodMembershipState | null>(null);
  const [people, setPeople] = useState<PodPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const load = useCallback(async () => {
    const data = await graphqlRequest(PodDetailsDocument, { podId }, { auth: true });
    const nextPod = data.pod ?? null;
    setPod(nextPod);
    setViewerId(data.me?.user_id ?? null);
    setVenue(data.publicVenues.find((v) => v.id === nextPod?.venue_id) ?? null);
    setLocation(data.locations.find((l) => l.id === nextPod?.location_id) ?? null);
    setSavedInitially((data.me?.saved_pod_ids ?? []).includes(nextPod?.id ?? ''));
    setMembershipState(data.podMembershipState ?? null);
    // Hosts + attendees public profiles for the avatar group (best-effort).
    const ids = Array.from(
      new Set([...(nextPod?.pod_hosts_id ?? []), ...(nextPod?.pod_attendees ?? [])]),
    );
    if (ids.length > 0) {
      const peopleData = await graphqlRequest(PodPeopleDocument, { ids }, { auth: true }).catch(
        () => null,
      );
      setPeople(peopleData?.publicUsersByIds ?? []);
    } else {
      setPeople([]);
    }
  }, [podId]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    load()
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  return {
    pod,
    venue,
    location,
    viewerId,
    savedInitially,
    membershipState,
    people,
    isLoading,
    error,
    refetch: load,
  };
}

/** Fetches a club + its active pods (auth). */
export function useClubDetails(clubId: string) {
  const [data, setData] = useState<ClubDetailsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    graphqlRequest(ClubDetailsDocument, { clubId }, { auth: true })
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [clubId]);

  return { club: data?.club ?? null, pods: data?.pods ?? [], isLoading, error };
}

/** Optimistic like + save for the pod-details actions, reusing the explore mutations. */
export function usePodActions(pod: PodDetail | null, savedInitially: boolean) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(savedInitially);
  const [savePending, setSavePending] = useState(false);

  useEffect(() => {
    setSaved(savedInitially);
  }, [savedInitially]);
  useEffect(() => {
    if (!pod) return;
    setLiked(pod.liked_by_me);
    setLikeCount(pod.like_count);
  }, [pod]);

  const toggleLike = async () => {
    if (!pod) return;
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevCount + (prevLiked ? -1 : 1));
    try {
      const res = await graphqlRequest(TogglePodLikeDocument, { podDocId: pod.id }, { auth: true });
      setLiked(res.togglePodLike.liked_by_me);
      setLikeCount(res.togglePodLike.like_count);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    }
  };

  const toggleSave = async () => {
    if (!pod || savePending) return;
    const prev = saved;
    setSaved(!prev);
    setSavePending(true);
    try {
      const res = await graphqlRequest(
        ToggleSavedPodDocument,
        { podDocId: pod.id },
        { auth: true },
      );
      setSaved(res.toggleSavedPod.saved);
    } catch {
      setSaved(prev);
    } finally {
      setSavePending(false);
    }
  };

  return { liked, likeCount, saved, savePending, toggleLike, toggleSave };
}

/** Pod comments thread (auth): loads on demand, plus add/delete. Reports count
 * deltas so the social bar can keep its badge in sync. */
export function usePodComments(podId: string, open: boolean) {
  const [comments, setComments] = useState<PodComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    graphqlRequest(PodCommentsDocument, { podId }, { auth: true })
      .then((data) => active && setComments(data.podComments))
      .catch((err) => active && setError((err as Error).message))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [podId, open]);

  const add = async (text: string) => {
    const created = await graphqlRequest(
      AddPodCommentDocument,
      { podId, text: text.trim() },
      { auth: true },
    );
    setComments((prev) => [created.addPodComment, ...prev]);
  };

  const remove = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    await graphqlRequest(DeletePodCommentDocument, { podId, commentId }, { auth: true });
  };

  return { comments, isLoading, error, add, remove };
}
