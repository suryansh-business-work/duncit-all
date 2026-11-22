import type { Translator } from '@duncit/app-settings';
import type { StatusColorMap } from '@duncit/ui';

type T = Translator['t'];

/*
 * Every key below is a literal: the localization gate has to see each one
 * rendered, so a status is never turned into a key by string building.
 */

export const verificationLabels = (t: T): Record<string, string> => ({
  PENDING: t('finance.failedPayments.verificationPending'),
  MATCHED: t('finance.failedPayments.verificationMatched'),
  UNMATCHED: t('finance.failedPayments.verificationUnmatched'),
  NOT_CAPTURED: t('finance.failedPayments.verificationNotCaptured'),
  ERROR: t('finance.failedPayments.verificationError'),
});

export const resolutionLabels = (t: T): Record<string, string> => ({
  OPEN: t('finance.failedPayments.resolutionOpen'),
  REFUNDED: t('finance.failedPayments.resolutionRefunded'),
  NOT_REFUNDABLE: t('finance.failedPayments.resolutionNotRefundable'),
  REJECTED: t('finance.failedPayments.resolutionRejected'),
  BOOKED: t('finance.failedPayments.resolutionBooked'),
});

export const refundLabels = (t: T): Record<string, string> => ({
  NONE: t('finance.failedPayments.refundNone'),
  PENDING: t('finance.failedPayments.refundPending'),
  PROCESSED: t('finance.failedPayments.refundProcessed'),
  FAILED: t('finance.failedPayments.refundFailed'),
});

export const reviewLabels = (t: T): Record<string, string> => ({
  APPROVED: t('finance.failedPayments.reviewApproved'),
  REJECTED: t('finance.failedPayments.reviewRejected'),
});

export const evidenceLabels = (t: T): Record<string, string> => ({
  SCREENSHOT: t('finance.failedPayments.evidenceScreenshot'),
  BANK_STATEMENT: t('finance.failedPayments.evidenceBankStatement'),
  TRANSACTION_ID: t('finance.failedPayments.evidenceTransactionId'),
});

export const sourceLabels = (t: T): Record<string, string> => ({
  CLIENT: t('finance.failedPayments.sourceClient'),
  SERVER: t('finance.failedPayments.sourceServer'),
  WEBHOOK: t('finance.failedPayments.sourceWebhook'),
  FINANCE: t('finance.failedPayments.sourceFinance'),
  SYSTEM: t('finance.failedPayments.sourceSystem'),
});

export const VERIFICATION_COLORS: StatusColorMap = {
  PENDING: 'default',
  MATCHED: 'success',
  UNMATCHED: 'warning',
  NOT_CAPTURED: 'info',
  ERROR: 'error',
};

export const RESOLUTION_COLORS: StatusColorMap = {
  OPEN: 'warning',
  REFUNDED: 'success',
  NOT_REFUNDABLE: 'info',
  REJECTED: 'error',
  BOOKED: 'success',
};

export const REFUND_COLORS: StatusColorMap = {
  NONE: 'default',
  PENDING: 'warning',
  PROCESSED: 'success',
  FAILED: 'error',
};

/** A label for a value the map knows, or the raw value for one it does not (a newer server). */
export const labelOf = (labels: Record<string, string>, value: string | null | undefined): string =>
  value ? (labels[value] ?? value) : '';

export const asOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));
