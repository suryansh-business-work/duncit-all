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
  PodAttendeeSeatsDocument,
  PodSpotFillsDocument,
  TogglePodCommentLikeDocument,
} from '@/graphql/details';
import { TogglePodLikeDocument, ToggleSavedPodDocument } from '@/graphql/explore';
import { graphqlRequest } from '@/services/graphql.client';
import { categoryPath } from '@/utils/category-match';
import { useRefreshRegistration } from '@/components/PullToRefresh';

export type PodComment = ResultOf<typeof PodCommentsDocument>['podComments'][number];
type PodDetailsResult = ResultOf<typeof PodDetailsDocument>;
export type PodDetail = NonNullable<PodDetailsResult['pod']>;
export type PodVenue = PodDetailsResult['publicVenues'][number];
export type PodLocation = PodDetailsResult['locations'][number];
export type PodMembershipState = PodDetailsResult['podMembershipState'];
export type PodPerson = ResultOf<typeof PodPeopleDocument>['publicUsersByIds'][number];
export type PodSpotFill = ResultOf<typeof PodSpotFillsDocument>['podSpotFills'][number];
type ClubDetailsResult = ResultOf<typeof ClubDetailsDocument>;
export type ClubDetail = NonNullable<ClubDetailsResult['club']>;
export type ClubPod = ClubDetailsResult['pods'][number];

/** Slug → doc id answers already fetched this session, so reopening a pod or a
 * club skips the lookup round trip, the way mWeb's Apollo cache does. A slug
 * never moves to another entity, so a remembered answer cannot go stale. */
const resolvedIds = new Map<string, string>();

const podSlugKey = (clubSlug: string, podSlug: string) => `pod:${clubSlug}/${podSlug}`;

/** Record a slug → id answer the caller already holds — a card knows its pod's
 * id — so the details screen it opens skips the lookup round trip. */
export function rememberPodId(clubSlug: string, podSlug: string, podId: string): void {
  resolvedIds.set(podSlugKey(clubSlug, podSlug), podId);
}

/** The doc id behind a detail screen: the id in-app navigation passed, else the
 * answer `lookup` gives for the shared slug URL named by `slugKey`. `resolving`
 * stays true while that lookup is out, so the screen holds its skeleton rather
 * than rendering "unavailable" for an entity that simply has not arrived yet.
 * Returns '' until resolved, and '' when the slug resolves to nothing. */
function useSlugResolvedId(
  id: string | undefined,
  slugKey: string | null,
  lookup: () => Promise<string>,
): { id: string; resolving: boolean } {
  const known = slugKey ? resolvedIds.get(slugKey) : undefined;
  const [resolved, setResolved] = useState(id ?? known ?? '');
  const [resolving, setResolving] = useState(!id && !known && slugKey !== null);
  useEffect(() => {
    const cached = slugKey ? resolvedIds.get(slugKey) : undefined;
    if (id || !slugKey || cached) {
      setResolved(id ?? cached ?? '');
      setResolving(false);
      return;
    }
    let active = true;
    setResolving(true);
    lookup()
      .then((next) => {
        if (next) resolvedIds.set(slugKey, next);
        if (!active) return;
        setResolved(next);
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
  }, [id, slugKey, lookup]);
  return { id: resolved, resolving };
}

/** Resolve a pod's doc id: use the id from in-app navigation, else resolve the
 * shared (mWeb) slug URL (/club/:clubSlug/pod/:podSlug) via podBySlugs so a
 * shared link opens the right pod. */
export function useResolvedPodId(params: { podId?: string; clubSlug?: string; podSlug?: string }): {
  podId: string;
  resolving: boolean;
} {
  const { podId, clubSlug = '', podSlug = '' } = params;
  const lookup = useCallback(
    () =>
      graphqlRequest(PodBySlugsDocument, { clubSlug, podSlug }, { auth: true }).then(
        (r) => r.podBySlugs?.id ?? '',
      ),
    [clubSlug, podSlug],
  );
  const slugKey = clubSlug && podSlug ? podSlugKey(clubSlug, podSlug) : null;
  const { id, resolving } = useSlugResolvedId(podId, slugKey, lookup);
  return { podId: id, resolving };
}

/** Resolve a club's doc id: use the id from in-app navigation, else resolve the
 * shared (mWeb) slug URL (/club/:clubSlug) via clubBySlug. */
export function useResolvedClubId(params: { clubId?: string; clubSlug?: string }): {
  clubId: string;
  resolving: boolean;
} {
  const { clubId, clubSlug = '' } = params;
  const lookup = useCallback(
    () =>
      graphqlRequest(ClubBySlugDocument, { clubSlug }, { auth: true }).then(
        (r) => r.clubBySlug?.id ?? '',
      ),
    [clubSlug],
  );
  const { id, resolving } = useSlugResolvedId(clubId, clubSlug ? `club:${clubSlug}` : null, lookup);
  return { clubId: id, resolving };
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
  const [spotFills, setSpotFills] = useState<PodSpotFill[]>([]);
  // One face per person; the seats they hold become a label beside their name.
  const [seatsByUser, setSeatsByUser] = useState<Record<string, number>>({});
  const [categoryCrumbs, setCategoryCrumbs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const load = useCallback(async () => {
    // Spot fills and seats need nothing but the id, so they go out alongside the
    // pod itself instead of queueing behind it — the screen used to wait on four
    // sequential round trips. Only the people lookup has to follow the pod (it
    // needs its host/attendee ids). Same shape as mWeb's PodDetailsPage.
    const fillsRequest = graphqlRequest(PodSpotFillsDocument, { podId }, { auth: true }).catch(
      () => null,
    );
    const seatsRequest = graphqlRequest(PodAttendeeSeatsDocument, { podId }, { auth: true }).catch(
      () => null,
    );
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
    // Hosts + attendees public profiles for the avatar group (best-effort),
    // awaited together with the fills/seats already in flight so the rest of
    // the screen lands in one render rather than three.
    const ids = Array.from(
      new Set([...(nextPod?.pod_hosts_id ?? []), ...(nextPod?.pod_attendees ?? [])]),
    );
    const peopleRequest =
      ids.length > 0
        ? graphqlRequest(PodPeopleDocument, { ids }, { auth: true }).catch(() => null)
        : null;
    const [peopleData, fillData, seatData] = await Promise.all([
      peopleRequest,
      fillsRequest,
      seatsRequest,
    ]);
    setPeople(peopleData?.publicUsersByIds ?? []);
    // Filled Backout seats for the struck-through attendee rows (best-effort).
    if (nextPod) {
      setSpotFills(fillData?.podSpotFills ?? []);
      setSeatsByUser(
        Object.fromEntries(
          (seatData?.podAttendeeSeats ?? []).map((row) => [row.user_id, row.seats]),
        ),
      );
    } else {
      setSpotFills([]);
      setSeatsByUser({});
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

  useRefreshRegistration(load);

  return {
    pod,
    venue,
    location,
    viewerId,
    viewerPhoto,
    savedInitially,
    membershipState,
    people,
    spotFills,
    seatsByUser,
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

  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    // Opened from a /club/:clubSlug link, this screen renders once before
    // useResolvedClubId has an id — and keeps the empty one when the slug
    // resolves to nothing. Asking for club "" could only ever answer with an
    // error, so it waits for a real id rather than spending a round trip on one.
    if (!clubId) {
      setIsLoading(false);
      return;
    }
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
  }, [clubId, attempt]);

  useRefreshRegistration(refetch);

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

  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

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
  }, [podId, open, attempt]);

  useRefreshRegistration(refetch);

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
