import type { useTranslation } from '@duncit/shell';
import type { EcommBrandRow } from './queries';

export type Decision = 'APPROVE' | 'REJECT';

type Translate = ReturnType<typeof useTranslation>['t'];

export interface ConfirmCopy {
  title: string;
  message: string;
  label: string;
  color: 'success' | 'error';
}

/** Approving grants a role and reactivating a rejection is a partner action, so
 * both decisions confirm first (@duncit/dialogs, no window.confirm). */
export const confirmCopy = (t: Translate): Record<Decision, ConfirmCopy> => ({
  APPROVE: {
    title: t('products.review.approveTitle'),
    message: t('products.review.approveBody'),
    label: t('products.review.approveConfirm'),
    color: 'success',
  },
  REJECT: {
    title: t('products.review.rejectTitle'),
    message: t('products.review.rejectBody'),
    label: t('products.review.rejectConfirm'),
    color: 'error',
  },
});

/**
 * Why Approve is disabled — the same three conditions `approveEcommBrand`
 * refuses on, read from the row so the reviewer sees them BEFORE the server
 * says no. An empty list means the brand can be approved.
 */
export function approveBlockedReasons(brand: EcommBrandRow, t: Translate): string[] {
  const reasons: string[] = [];
  const stepsIncomplete = brand.completion.steps.some((step) => step.required && !step.complete);
  if (stepsIncomplete) reasons.push(t('products.brandReview.reasonSteps'));
  const { shiprocket, razorpay } = brand.integrations;
  if (!shiprocket.connected || !razorpay.connected) {
    reasons.push(t('products.brandReview.reasonIntegration'));
  }
  const { consent } = brand;
  if (consent.available && !(consent.accepted && consent.current)) {
    reasons.push(t('products.brandReview.reasonConsent'));
  }
  return reasons;
}
