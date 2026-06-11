import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { PodIdeaStatus } from '@/generated/graphql/graphql';
import {
  AddPodIdeaCommentDocument,
  CreatePodIdeaDocument,
  DeletePodIdeaCommentDocument,
  DeletePodIdeaDocument,
  PodIdeaDetailsDocument,
  PodIdeasDocument,
  SharePodIdeaDocument,
  TogglePodIdeaLikeDocument,
} from '@/graphql/pod-ideas';
import { graphqlRequest } from '@/services/graphql.client';

type PodIdeasData = ResultOf<typeof PodIdeasDocument>;
export type PodIdea = PodIdeasData['podIdeas'][number];
type PodIdeaDetailsData = ResultOf<typeof PodIdeaDetailsDocument>;
export type PodIdeaDetail = NonNullable<PodIdeaDetailsData['podIdea']>;
export type PodIdeaComment = PodIdeaDetail['comments'][number];

/**
 * Pod Ideas board (auth): the APPROVED feed (filtered by `search`) plus the
 * viewer's own non-approved submissions, with create/like/share/delete actions
 * that refetch. RN twin of mWeb's PodIdeasPage data layer.
 */
export function usePodIdeas(search: string) {
  const [data, setData] = useState<PodIdeasData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const trimmed = search.trim();
  const load = useCallback(async () => {
    const result = await graphqlRequest(
      PodIdeasDocument,
      { filter: { status: PodIdeaStatus.Approved, ...(trimmed ? { search: trimmed } : {}) } },
      { auth: true },
    );
    setData(result);
  }, [trimmed]);

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

  const create = async (title: string, description: string) => {
    await graphqlRequest(
      CreatePodIdeaDocument,
      { input: { title: title.trim(), description: description.trim() } },
      { auth: true },
    );
    await load();
  };

  const toggleLike = async (id: string) => {
    await graphqlRequest(TogglePodIdeaLikeDocument, { id }, { auth: true });
    await load();
  };

  const share = async (id: string) => {
    await graphqlRequest(SharePodIdeaDocument, { id }, { auth: true });
    await load();
  };

  const deleteIdea = async (id: string) => {
    await graphqlRequest(DeletePodIdeaDocument, { id }, { auth: true });
    await load();
  };

  return {
    ideas: data?.podIdeas ?? [],
    myIdeas: (data?.myPodIdeas ?? []).filter((i) => i.status !== PodIdeaStatus.Approved),
    myId: data?.me?.user_id,
    hasData: !!data,
    isLoading,
    error,
    refetch: load,
    create,
    toggleLike,
    share,
    deleteIdea,
  };
}

/**
 * One idea + its comments (auth), with like and add/delete-comment actions that
 * reload the thread and notify the list via `onChanged` so counts stay in sync.
 */
export function usePodIdeaDetails(id: string, onChanged: () => void) {
  const [idea, setIdea] = useState<PodIdeaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const result = await graphqlRequest(PodIdeaDetailsDocument, { id }, { auth: true });
    setIdea(result.podIdea ?? null);
  }, [id]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    load()
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  const runAndReload = useCallback(
    async (run: () => Promise<unknown>) => {
      await run();
      await load();
      onChanged();
    },
    [load, onChanged],
  );

  const addComment = (text: string) =>
    runAndReload(() =>
      graphqlRequest(AddPodIdeaCommentDocument, { id, text: text.trim() }, { auth: true }),
    );

  const deleteComment = (commentId: string) =>
    runAndReload(() =>
      graphqlRequest(DeletePodIdeaCommentDocument, { id, commentId }, { auth: true }),
    );

  const toggleLike = () =>
    runAndReload(() => graphqlRequest(TogglePodIdeaLikeDocument, { id }, { auth: true }));

  return { idea, isLoading, addComment, deleteComment, toggleLike };
}
