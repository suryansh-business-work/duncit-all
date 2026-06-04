import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { ClubDetailsDocument, PodDetailsDocument } from '@/graphql/details';
import { TogglePodLikeDocument, ToggleSavedPodDocument } from '@/graphql/explore';
import { graphqlRequest } from '@/services/graphql.client';

export type PodDetail = NonNullable<ResultOf<typeof PodDetailsDocument>['pod']>;
type ClubDetailsResult = ResultOf<typeof ClubDetailsDocument>;
export type ClubDetail = NonNullable<ClubDetailsResult['club']>;
export type ClubPod = ClubDetailsResult['pods'][number];

/** Fetches a single pod (auth). The viewer's saved set rides along for the Save button. */
export function usePodDetails(podId: string) {
  const [pod, setPod] = useState<PodDetail | null>(null);
  const [savedInitially, setSavedInitially] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    graphqlRequest(PodDetailsDocument, { podId }, { auth: true })
      .then((data) => {
        if (!active) return;
        setPod(data.pod ?? null);
        setSavedInitially((data.me?.saved_pod_ids ?? []).includes(data.pod?.id ?? ''));
      })
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [podId]);

  return { pod, savedInitially, isLoading, error };
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
    if (!pod) return;
    const prev = saved;
    setSaved(!prev);
    try {
      const res = await graphqlRequest(
        ToggleSavedPodDocument,
        { podDocId: pod.id },
        { auth: true },
      );
      setSaved(res.toggleSavedPod.saved);
    } catch {
      setSaved(prev);
    }
  };

  return { liked, likeCount, saved, toggleLike, toggleSave };
}
