import { useCallback, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { Text, XStack, YStack } from 'tamagui';
import { POD_FEEDBACK_ASPECT_LABEL, type PodFeedbackAspect } from '@duncit/utils';

import { StarRow } from '@/components/details/club/ClubRatingParts';
import { ClubAdminPodFeedbackDocument } from '@/graphql/club-pod-details';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { PodDetailSection } from './PodDetailSection';

type FeedbackSummary = ResultOf<typeof ClubAdminPodFeedbackDocument>['clubAdminPodFeedback'];
type AspectRow = FeedbackSummary['aspects'][number];
type ReviewRowData = FeedbackSummary['recent'][number];

const aspectLabel = (aspect: string) =>
  POD_FEEDBACK_ASPECT_LABEL[aspect as PodFeedbackAspect] ?? aspect;

/** One averaged part — the label, its stars and how many people said so. */
function AspectAverage({ row }: Readonly<{ row: AspectRow }>) {
  return (
    <XStack alignItems="center" justifyContent="space-between" gap={12}>
      <Text fontSize={13} fontWeight="600" color="$color" numberOfLines={1}>
        {aspectLabel(row.aspect)}
      </Text>
      <XStack alignItems="center" gap={8}>
        <StarRow value={row.average} size={13} />
        <Text fontSize={12} color="$muted">
          {[row.average.toFixed(1), row.count].join(' · ')}
        </Text>
      </XStack>
    </XStack>
  );
}

/** One guest's own rating, with whatever they wrote under it. */
function FeedbackEntry({ row, when }: Readonly<{ row: ReviewRowData; when: string }>) {
  return (
    <YStack
      testID={`club-pod-detail-rating-${row.id}`}
      gap={4}
      paddingTop={10}
      borderTopWidth={1}
      borderTopColor="$borderColor"
    >
      <XStack alignItems="center" gap={8}>
        <Text flex={1} fontSize={13} fontWeight="600" color="$color" numberOfLines={1}>
          {row.user.name}
        </Text>
        <StarRow value={row.rating} size={13} />
      </XStack>
      <Text fontSize={12} color="$muted">
        {when}
      </Text>
      {row.message ? (
        <Text fontSize={13} color="$color">
          {row.message}
        </Text>
      ) : null}
    </YStack>
  );
}

/**
 * "Ratings" — what guests scored this pod on, part by part, and the ratings
 * themselves.
 *
 * The averages come first because that is the question a club admin opens the
 * card with, and the comments underneath say why. Tamagui twin of
 * `@duncit/pod-details`' `PodFeedbackSection` (rule 27).
 */
export function PodDetailFeedback({ podId }: Readonly<{ podId: string }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    const res = await graphqlRequest(
      ClubAdminPodFeedbackDocument,
      { pod_doc_id: podId },
      { auth: true },
    );
    setSummary(res.clubAdminPodFeedback);
    setHasError(false);
  }, [podId]);

  const { isLoading, refetch } = useReloadableQuery(load, {
    enabled: Boolean(podId),
    onError: () => setHasError(true),
  });

  const rated = Boolean(summary && summary.total > 0);
  const settled = !isLoading && !hasError;
  const empty = settled && !rated ? t('podDetailsPanel.podFeedbackSection.noRatings') : null;

  return (
    <PodDetailSection
      title={t('podDetailsPanel.podFeedbackSection.ratings')}
      testID="club-pod-detail-ratings"
      badge={summary?.total}
      isLoading={isLoading && !summary}
      hasError={hasError}
      onRetry={refetch}
      emptyText={empty}
    >
      {rated && summary ? (
        <YStack gap={12}>
          <XStack alignItems="center" gap={12}>
            <Text
              testID="club-pod-detail-rating-average"
              fontSize={28}
              fontWeight="700"
              color="$color"
            >
              {summary.overall_average.toFixed(1)}
            </Text>
            <YStack gap={2}>
              <StarRow value={summary.overall_average} />
              <Text fontSize={12} color="$muted">
                {t('podDetailsPanel.podFeedbackSection.ratingsCount', {
                  vars: { count: summary.total },
                })}
              </Text>
            </YStack>
          </XStack>
          {summary.aspects.map((row) => (
            <AspectAverage key={row.aspect} row={row} />
          ))}
          {summary.recent.map((row) => (
            <FeedbackEntry key={row.id} row={row} when={formatDateTime(row.created_at)} />
          ))}
        </YStack>
      ) : null}
    </PodDetailSection>
  );
}
