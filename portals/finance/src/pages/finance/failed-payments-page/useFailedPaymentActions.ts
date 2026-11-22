import { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  INITIATE_FAILED_PAYMENT_REFUND,
  MARK_FAILED_PAYMENT_NOT_REFUNDABLE,
  REVIEW_FAILED_PAYMENT,
  type FailedPaymentDetail,
  type FailedPaymentTarget,
} from './queries';
import type { ReviewFailedPaymentValues } from './review-failed-payment';

export type FailedPaymentDialogKind = 'REFUND' | 'REVIEW' | 'NOT_REFUNDABLE';

export interface OpenDialog {
  kind: FailedPaymentDialogKind;
  target: FailedPaymentTarget;
  /** Minted when the dialog opens and reused by every retry from it, so a double click is one request. */
  requestId: string;
}

export interface FailedPaymentActions {
  dialog: OpenDialog | null;
  busy: boolean;
  error: string | null;
  open: (kind: FailedPaymentDialogKind, target: FailedPaymentTarget) => void;
  close: () => void;
  confirmRefund: (open: OpenDialog) => Promise<void>;
  submitDecision: (open: OpenDialog, values: ReviewFailedPaymentValues) => Promise<void>;
}

type RefundData = { initiateFailedPaymentRefund: FailedPaymentDetail };
type ReviewData = { reviewFailedPayment: FailedPaymentDetail };
type NotRefundableData = { markFailedPaymentNotRefundable: FailedPaymentDetail };

/**
 * The three decisions Finance takes on a case — refund, review, close as not
 * refundable — shared by the list and the detail page. Each answers with the
 * fresh case, which goes to `onDone` so the caller can repaint from it.
 */
export function useFailedPaymentActions(onDone: (detail: FailedPaymentDetail) => void): FailedPaymentActions {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback((kind: FailedPaymentDialogKind, target: FailedPaymentTarget) => {
    setError(null);
    setDialog({ kind, target, requestId: globalThis.crypto.randomUUID() });
  }, []);

  const close = useCallback(() => {
    if (!busy) setDialog(null);
  }, [busy]);

  const run = useCallback(
    async (send: () => Promise<FailedPaymentDetail | undefined>, done: string) => {
      setBusy(true);
      setError(null);
      try {
        const detail = await send();
        notifySuccess(done);
        setDialog(null);
        if (detail) onDone(detail);
      } catch (err) {
        // The server names why it refused (already refunded, booking exists…).
        setError(parseApiError(err));
      } finally {
        setBusy(false);
      }
    },
    [onDone],
  );

  const confirmRefund = useCallback(async (current: OpenDialog) => {
    const variables = { caseId: current.target.id, clientRequestId: current.requestId };
    await run(async () => {
      const { data } = await client.mutate<RefundData>({ mutation: INITIATE_FAILED_PAYMENT_REFUND, variables });
      return data?.initiateFailedPaymentRefund;
    }, t('finance.failedPayments.refundStarted'));
  }, [client, run, t]);

  const submitDecision = useCallback(
    async (current: OpenDialog, values: ReviewFailedPaymentValues) => {
      const base = { caseId: current.target.id, note: values.note, clientRequestId: current.requestId };
      if (current.kind === 'NOT_REFUNDABLE') {
        await run(async () => {
          const { data } = await client.mutate<NotRefundableData>({ mutation: MARK_FAILED_PAYMENT_NOT_REFUNDABLE, variables: base });
          return data?.markFailedPaymentNotRefundable;
        }, t('finance.failedPayments.markedNotRefundable'));
        return;
      }
      await run(async () => {
        const { data } = await client.mutate<ReviewData>({
          mutation: REVIEW_FAILED_PAYMENT,
          variables: { ...base, decision: values.decision },
        });
        return data?.reviewFailedPayment;
      }, t('finance.failedPayments.reviewSaved'));
    },
    [client, run, t],
  );

  return { dialog, busy, error, open, close, confirmRefund, submitDecision };
}
