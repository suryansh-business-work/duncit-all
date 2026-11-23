import type { Translator } from '@duncit/app-settings';
import type { PaymentRefundKind, PaymentRefundState } from './queries';

type T = Translator['t'];

/*
 * Every key below is a literal: the localization gate has to see each one
 * rendered, so a kind, status or source is never turned into a key by string
 * building. An unknown value (a newer server) falls back to its raw text via
 * `labelOf`.
 */

/** The accordion's heading, one per kind of refund. */
export const refundKindTitles = (t: T): Record<PaymentRefundKind, string> => ({
  COIN: t('finance.payment.refundArea.kindCoin'),
  POD_PAYMENT: t('finance.payment.refundArea.kindPodPayment'),
  PAYMENT: t('finance.payment.refundArea.kindPayment'),
  POD_SHOP: t('finance.payment.refundArea.kindPodShop'),
  ECOMM: t('finance.payment.refundArea.kindEcomm'),
  FAILED_PAYMENT: t('finance.payment.refundArea.kindFailedPayment'),
  RENTAL: t('finance.payment.refundArea.kindRental'),
});

/** The three buckets the section chip and the accordion colour read. */
export const refundStateLabels = (t: T): Record<PaymentRefundState, string> => ({
  PENDING: t('finance.payment.refundArea.statePending'),
  COMPLETED: t('finance.payment.refundArea.stateCompleted'),
  FAILED: t('finance.payment.refundArea.stateFailed'),
});

/** The refund engine's own status, in words a person can act on. */
export const refundStatusLabels = (t: T): Record<string, string> => ({
  QUEUED: t('finance.payment.refundArea.statusQueued'),
  SENDING: t('finance.payment.refundArea.statusSending'),
  PROCESSING: t('finance.payment.refundArea.statusProcessing'),
  SUCCEEDED: t('finance.payment.refundArea.statusSucceeded'),
  FAILED: t('finance.payment.refundArea.statusFailed'),
  RECONCILIATION_REQUIRED: t('finance.payment.refundArea.statusReconciliation'),
  NOT_APPLICABLE: t('finance.payment.refundArea.statusNotApplicable'),
  HELD: t('finance.payment.refundArea.statusHeld'),
  PROCESSED: t('finance.payment.refundArea.statusProcessed'),
  RECORDED: t('finance.payment.refundArea.statusRecorded'),
  PENDING: t('finance.payment.refundArea.statusPending'),
  NOT_STARTED: t('finance.payment.refundArea.statusNotStarted'),
  CREDITED: t('finance.payment.refundArea.statusCredited'),
});

/** Why the refund was sent. */
export const refundSourceLabels = (t: T): Record<string, string> => ({
  FINANCE_REFUND: t('finance.payment.refundArea.sourceFinanceRefund'),
  POD_CANCELLATION: t('finance.payment.refundArea.sourcePodCancellation'),
  BACKOUT: t('finance.payment.refundArea.sourceBackout'),
  RENTAL: t('finance.payment.refundArea.sourceRental'),
  HELD: t('finance.payment.refundArea.sourceHeld'),
  RECORDED: t('finance.payment.refundArea.sourceRecorded'),
  CANCELLATION: t('finance.payment.refundArea.sourceCancellation'),
  RETURN: t('finance.payment.refundArea.sourceReturn'),
  CASE: t('finance.payment.refundArea.sourceCase'),
  LEDGER: t('finance.payment.refundArea.sourceLedger'),
});

/** The chip colour of each bucket — theme palette names, never raw colours. */
export const REFUND_STATE_COLORS: Record<PaymentRefundState, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  FAILED: 'error',
};
