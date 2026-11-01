import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { RECOMMEND_NEXT_REEL, REEL_ANALYTICS } from '../../queries';
import type { ReelAnalytics, ReelRecommendation } from '../../types';

interface RecommendData {
  recommendNextReel: { run_id: string; recommendations: ReelRecommendation[] };
}

/**
 * How the reel's posts have done, read when the drawer opens and not before,
 * and what to make next — asked for on demand, since it costs a model call.
 */
export function useReelAnalytics(projectId: string, open: boolean) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ reelAnalytics: ReelAnalytics }>(REEL_ANALYTICS, {
    variables: { project_id: projectId },
    skip: !open,
    fetchPolicy: 'cache-and-network',
  });
  const [recommendMutation, { loading: recommending }] = useMutation<RecommendData>(RECOMMEND_NEXT_REEL);
  const [recommendations, setRecommendations] = useState<ReelRecommendation[] | null>(null);

  const recommend = useCallback(async () => {
    try {
      const { data: answer } = await recommendMutation({ variables: { project_id: projectId } });
      setRecommendations(answer?.recommendNextReel.recommendations ?? []);
    } catch (error) {
      notifyError(parseApiError(error, t('ai.reels.analytics.recommendFailed')));
    }
  }, [projectId, recommendMutation, t]);

  return { analytics: data?.reelAnalytics ?? null, loading, error, recommend, recommending, recommendations };
}

export type ReelAnalyticsTools = ReturnType<typeof useReelAnalytics>;
