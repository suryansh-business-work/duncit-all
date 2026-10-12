import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { toReviewInput, type PaymentReleaseReviewValues } from '../payment-release-review';
import { money } from '../../pod-finance-page/queries';
import {
  APPROVE_POD_PAYMENT_RELEASE,
  POD_PAYMENT_RELEASE,
  REVIEW_PAYMENT_RELEASE,
  type PaymentReleaseRow,
  type PodPaymentReleaseDetail,
} from '../queries';

interface QueryData {
  podPaymentRelease: PodPaymentReleaseDetail;
  publicFinanceSettings: { currency_symbol: string };
}

/**
 * One pod's request and the two ways Finance decides it: every pending payout
 * at once ("Approve all payouts"), or one payout by itself through the review
 * dialog (approve in part, or reject with a reason).
 *
 * Both re-read the request afterwards rather than patching the cache — the
 * request's own status is derived from its payouts on the server.
 */
export function usePodPaymentRelease(id: string | undefined) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const query = useQuery<QueryData>(POD_PAYMENT_RELEASE, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const [approve, approveState] = useMutation(APPROVE_POD_PAYMENT_RELEASE);
  const [review, reviewState] = useMutation(REVIEW_PAYMENT_RELEASE);
  const [reviewFor, setReviewFor] = useState<PaymentReleaseRow | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const symbol = query.data?.publicFinanceSettings?.currency_symbol ?? '';

  const approveAll = async (pendingTotal: number) => {
    const ok = await confirm({
      title: t('finance.paymentRelease.approveAllTitle'),
      message: t('finance.paymentRelease.approveAllBody', {
        vars: { amount: money(symbol, pendingTotal) },
      }),
      confirmLabel: t('finance.paymentRelease.approveAll'),
    });
    if (!ok) return;
    try {
      await approve({ variables: { id } });
      notifySuccess(t('finance.paymentRelease.approvedToast'));
    } catch (error) {
      notifyError((error as Error).message);
    }
    // Also after a failure: some payouts may have gone through before it.
    await query.refetch();
  };

  const openReview = (release: PaymentReleaseRow) => {
    setReviewError(null);
    setReviewFor(release);
  };

  const submitReview = async (values: PaymentReleaseReviewValues) => {
    if (!reviewFor) return;
    setReviewError(null);
    try {
      await review({
        variables: {
          id: reviewFor.id,
          input: toReviewInput(values, Number(reviewFor.amount_requested || 0)),
        },
      });
      setReviewFor(null);
      notifySuccess(t('finance.paymentRelease.reviewSaved'));
      await query.refetch();
    } catch (error) {
      setReviewError((error as Error).message);
    }
  };

  return {
    detail: query.data?.podPaymentRelease,
    loading: query.loading,
    error: query.error,
    symbol,
    approveAll,
    approving: approveState.loading,
    reviewFor,
    reviewError,
    reviewing: reviewState.loading,
    openReview,
    closeReview: () => setReviewFor(null),
    submitReview,
  };
}
