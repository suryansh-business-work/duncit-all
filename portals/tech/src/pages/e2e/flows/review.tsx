import type { useTranslation } from '@duncit/shell';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import type { E2eReviewStatus } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];
export type ReviewLabels = Readonly<Record<E2eReviewStatus, string>>;

const REVIEW_COLORS: StatusColorMap = {
  NOT_REVIEWED: 'default',
  NEEDS_REVIEW: 'warning',
  LOOKS_GOOD: 'success',
};

const REVIEW_ORDER: readonly E2eReviewStatus[] = ['NOT_REVIEWED', 'NEEDS_REVIEW', 'LOOKS_GOOD'];

export const reviewLabels = (t: Translate): ReviewLabels => ({
  NOT_REVIEWED: t('tech.e2eFlows.reviewNotReviewed'),
  NEEDS_REVIEW: t('tech.e2eFlows.reviewNeedsReview'),
  LOOKS_GOOD: t('tech.e2eFlows.reviewLooksGood'),
});

/** The Review column's filter choices, in the order a sub flow moves through them. */
export const reviewOptions = (labels: ReviewLabels) =>
  REVIEW_ORDER.map((value) => ({ value, label: labels[value] }));

export function ReviewChip({
  status,
  labels,
}: Readonly<{ status: E2eReviewStatus; labels: ReviewLabels }>) {
  return <StatusChip status={status} colorMap={REVIEW_COLORS} label={labels[status]} />;
}

export const makeRenderReview = (labels: ReviewLabels) => {
  const renderReview = (row: Readonly<{ review_status: E2eReviewStatus }>) => (
    <ReviewChip status={row.review_status} labels={labels} />
  );
  return renderReview;
};
