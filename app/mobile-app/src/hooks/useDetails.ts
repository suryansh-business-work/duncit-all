import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  AddPodCommentDocument,
  ClubBySlugDocument,
  ClubDetailsDocument,
  DeletePodCommentDocument,
  PodBySlugsDocument,
  PodCommentsDocument,
  PodDetailsDocument,
  PodPeopleDocument,
  TogglePodCommentLikeDocument,
} from '@/graphql/details';
import { TogglePodLikeDocument, ToggleSavedPodDocument } from '@/graphql/explore';
import { graphqlRequest } from '@/services/graphql.client';
import { categoryPath } from '@/utils/category-match';

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

/** Resolve a pod's doc id: use the id from in-app navigation, else resolve the
 * shared (mWeb) slug URL (/club/:clubSlug/pod/:podSlug) via podBySlugs so a
 * shared link opens the right pod. Returns '' until resolved. */
export function useResolvedPodId(params: { podId?: string; clubSlug?: string; podSlug?: string }): {
  podId: string;
  resolving: boolean;
} {
  const { podId, clubSlug, podSlug } = params;
  // A slug link (no in-app id) still needs a lookup before the details can load.
  const needsResolve = !podId && !!clubSlug && !!podSlug;
  const [resolved, setResolved] = useState(podId ?? '');
  const [resolving, setResolving] = useState(needsResolve);
  useEffect(() => {
    if (podId || !clubSlug || !podSlug) {
      setResolved(podId ?? '');
      setResolving(false);
      return;
    }
    let active = true;
    setResolving(true);
    graphqlRequest(PodBySlugsDocument, { clubSlug, podSlug }, { auth: true })
      .then((r) => {
        if (!active) return;
        setResolved(r.podBySlugs?.id ?? '');
        setResolving(false);
      })
      .catch(() => {
        if (!active) return;
        setResolved('');
        setResolving(false);
      });
    return () => {
      active = false;
    };
  }, [podId, clubSlug, podSlug]);
  return { podId: resolved, resolving };
}

/** Resolve a club's doc id: use the id from in-app navigation, else resolve the
 * shared (mWeb) slug URL (/club/:clubSlug) via clubBySlug. Returns '' until resolved. */
export function useResolvedClubId(params: { clubId?: string; clubSlug?: string }): string {
  const { clubId, clubSlug } = params;
  const [resolved, setResolved] = useState(clubId ?? '');
  useEffect(() => {
    if (clubId || !clubSlug) {
      setResolved(clubId ?? '');
      return;
    }
    let active = true;
    graphqlRequest(ClubBySlugDocument, { clubSlug }, { auth: true })
      .then((r) => active && setResolved(r.clubBySlug?.id ?? ''))
      .catch(() => active && setResolved(''));
    return () => {
      active = false;
    };
  }, [clubId, clubSlug]);
  return resolved;
}

/** Fetches a single pod (auth) plus the venue/location it resolves to (for the
 * map + "Where") and the viewer id (for comments). Saved set rides along too. */
export function usePodDetails(podId: string) {
  const [pod, setPod] = useState<PodDetail | null>(null);
  const [venue, setVenue] = useState<PodVenue | null>(null);
  const [location, setLocation] = useState<PodLocation | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<string | null>(null);
  const [savedInitially, setSavedInitially] = useState(false);
  const [membershipState, setMembershipState] = useState<PodMembershipState | null>(null);
  const [people, setPeople] = useState<PodPerson[]>([]);
  const [categoryCrumbs, setCategoryCrumbs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const load = useCallback(async () => {
    const data = await graphqlRequest(PodDetailsDocument, { podId }, { auth: true });
    const nextPod = data.pod ?? null;
    setPod(nextPod);
    // The pod's club category as a Super › Category › Sub breadcrumb.
    setCategoryCrumbs(
      categoryPath(data.categories, nextPod?.club?.super_category_id, nextPod?.club?.category_id),
    );
    setViewerId(data.me?.user_id ?? null);
    setViewerPhoto(data.me?.profile_photo ?? null);
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
    if (!podId) {
      // No resolved id yet (a slug link is still resolving, or resolved to
      // nothing) — clear any stale pod and stop loading so the caller shows the
      // resolving skeleton / not-found state rather than flashing "unavailable".
      setPod(null);
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    load()
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [podId, load]);

  return {
    pod,
    venue,
    location,
    viewerId,
    viewerPhoto,
    savedInitially,
    membershipState,
    people,
    categoryCrumbs,
    isLoading,
    error,
    refetch: load,
  };
}

/** Fetches a club + its active pods (auth), plus the members who joined them.
 * Also resolves category/super-category display names and the viewer's
 * following_user_ids (for the Friends-in-club section). */
export function useClubDetails(clubId: string) {
  const [data, setData] = useState<ClubDetailsResult | null>(null);
  const [members, setMembers] = useState<PodPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    graphqlRequest(ClubDetailsDocument, { clubId }, { auth: true })
      .then(async (result) => {
        if (!active) return;
        setData(result);

        // Resolve member profiles.
        const ids = Array.from(new Set(result.pods.flatMap((pod) => pod.pod_attendees)));
        const people =
          ids.length > 0
            ? await graphqlRequest(PodPeopleDocument, { ids }, { auth: true }).catch(() => null)
            : null;
        if (active) setMembers(people ? people.publicUsersByIds : []);
      })
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [clubId]);

  const followingInitially = (data?.me?.following_club_ids ?? []).includes(clubId);
  const followingUserIds: string[] = data?.me?.following_user_ids ?? [];
  // Super › Category › Sub names, walked from the club's leaf category up the tree.
  const categoryCrumbs = categoryPath(
    data?.categories ?? [],
    data?.club?.super_category_id,
    data?.club?.category_id,
  );
  return {
    club: data?.club ?? null,
    pods: data?.pods ?? [],
    members,
    followingUserIds,
    categoryCrumbs,
    followingInitially,
    isLoading,
    error,
  };
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
    // Optimistically drop the comment, but keep a snapshot so we can restore the
    // thread (and let the caller skip the count decrement) if the server rejects.
    const snapshot = comments;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await graphqlRequest(DeletePodCommentDocument, { podId, commentId }, { auth: true });
    } catch (err) {
      setComments(snapshot);
      throw err;
    }
  };

  // Optimistic comment reaction (explore item 4): flip locally, then reconcile
  // with the server, reverting on failure.
  const flip = (commentId: string) =>
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              liked_by_me: !c.liked_by_me,
              like_count: c.like_count + (c.liked_by_me ? -1 : 1),
            }
          : c,
      ),
    );

  const toggleLike = async (commentId: string) => {
    flip(commentId);
    try {
      const res = await graphqlRequest(
        TogglePodCommentLikeDocument,
        { podId, commentId },
        { auth: true },
      );
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                liked_by_me: res.togglePodCommentLike.liked_by_me,
                like_count: res.togglePodCommentLike.like_count,
              }
            : c,
        ),
      );
    } catch {
      flip(commentId);
    }
  };

  return { comments, isLoading, error, add, remove, toggleLike };
}
