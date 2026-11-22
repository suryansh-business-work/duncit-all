import type { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * The decision and the payment are separate columns, each with its own filter.
 * They are never merged into one "status", because Finance reads them apart: an
 * approval says a person decided, a payment says what the bank did, and a
 * withdrawal can be approved and then fail to pay.
 */
export const decisionOptions = (t: Translate) => [
  { value: 'PENDING', label: t('finance.common.pending') },
  { value: 'APPROVED', label: t('finance.payouts.statusApproved') },
  { value: 'PARTIALLY_APPROVED', label: t('finance.payouts.statusPartiallyApproved') },
  { value: 'REJECTED', label: t('finance.common.rejected') },
];

export const paymentOptions = (t: Translate) => [
  { value: 'PROCESSING', label: t('finance.payouts.statusProcessing') },
  { value: 'PAID', label: t('finance.withdrawals.paid') },
  { value: 'FAILED', label: t('finance.payouts.statusFailed') },
];

/** The label for any single status the Finance tables show. */
export const statusLabel = (t: Translate, status: string): string => {
  const labels: Record<string, string> = {
    PENDING: t('finance.common.pending'),
    APPROVED: t('finance.payouts.statusApproved'),
    PARTIALLY_APPROVED: t('finance.payouts.statusPartiallyApproved'),
    REJECTED: t('finance.common.rejected'),
    PROCESSING: t('finance.payouts.statusProcessing'),
    PAID: t('finance.withdrawals.paid'),
    FAILED: t('finance.payouts.statusFailed'),
  };
  return labels[status] ?? status;
};

/** The audit trail's actions, in the order a withdrawal moves through them. */
export const auditActionOptions = (t: Translate) => [
  { value: 'APPROVED', label: t('finance.payouts.actionApproved') },
  { value: 'PARTIALLY_APPROVED', label: t('finance.payouts.actionPartiallyApproved') },
  { value: 'REJECTED', label: t('finance.payouts.actionRejected') },
  { value: 'PAYOUT_SENT', label: t('finance.payouts.actionPayoutSent') },
  { value: 'PAYOUT_RETRIED', label: t('finance.payouts.actionPayoutRetried') },
  { value: 'PAYOUT_PAID', label: t('finance.payouts.actionPayoutPaid') },
  { value: 'PAYOUT_FAILED', label: t('finance.payouts.actionPayoutFailed') },
  { value: 'MARKED_PAID_MANUALLY', label: t('finance.payouts.actionMarkedPaid') },
  { value: 'TRANSFER_CREATED', label: t('finance.payouts.actionTransferCreated') },
];
