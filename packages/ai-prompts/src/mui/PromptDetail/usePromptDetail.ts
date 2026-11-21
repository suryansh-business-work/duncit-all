import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { parseApiError } from '@duncit/utils';
import { AI_PROMPT_DETAIL, SCORE_AI_PROMPT } from '../../detailQueries';
import { usePromptEvent } from '../shared/usePromptEvent';
import type { PortalEventInput, PromptDetail, PromptQuality } from '../../detailTypes';
import { runInBackground } from '../../log';

/**
 * One prompt's detail, the way the detail view needs it.
 *
 * Opening a prompt does three things once: reads the detail fresh (another
 * operator may have just edited it), counts a DETAIL_VIEW, and — when there is
 * no review of the CURRENT body yet — asks for one. The server answers that ask
 * from its stored review while the body is unchanged, so reopening a prompt
 * never spends a second review; only an edit or "Rescore" does.
 */
export function usePromptDetail(promptId: string | null) {
  const { data, loading, error, refetch } = useQuery<{ aiPromptDetail: PromptDetail | null }>(AI_PROMPT_DETAIL, {
    variables: { id: promptId ?? '' },
    skip: !promptId,
    fetchPolicy: 'network-only',
  });
  const [scoreMutation, scoring] = useMutation<{ scoreAiPrompt: PromptQuality }>(SCORE_AI_PROMPT);
  const recordEvent = usePromptEvent();
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [quality, setQuality] = useState<PromptQuality | null>(null);

  const detail = data?.aiPromptDetail ?? null;

  const record = useCallback(
    (input: PortalEventInput) => {
      // Only reachable from a loaded detail, so the id is set.
      recordEvent(String(promptId), input);
    },
    [promptId, recordEvent],
  );

  const score = useCallback(
    async (force: boolean) => {
      setScoreError(null);
      try {
        const res = await scoreMutation({ variables: { id: String(promptId), force } });
        // A failed review rejects, so a resolved one carries its data.
        setQuality((res.data as { scoreAiPrompt: PromptQuality }).scoreAiPrompt);
      } catch (err) {
        setScoreError(parseApiError(err));
      }
    },
    [promptId, scoreMutation],
  );

  // One view per prompt opened; one review ask per body (an edit made from the
  // detail view comes back with a new updated_at and is reviewed again).
  const viewedRef = useRef<string | null>(null);
  const reviewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!promptId || !detail) return;
    if (viewedRef.current !== promptId) {
      viewedRef.current = promptId;
      record({ type: 'DETAIL_VIEW' });
    }
    setQuality(detail.quality);
    const body = `${promptId}:${String(detail.prompt.updated_at)}`;
    if ((!detail.quality || detail.quality.stale) && reviewedRef.current !== body) {
      reviewedRef.current = body;
      runInBackground(score(false), 'score');
    }
  }, [promptId, detail, record, score]);

  return {
    detail,
    loading,
    error: error ? parseApiError(error) : null,
    refetch,
    quality: quality ?? detail?.quality ?? null,
    scoring: scoring.loading,
    scoreError,
    rescore: () => score(true),
    record,
  };
}
