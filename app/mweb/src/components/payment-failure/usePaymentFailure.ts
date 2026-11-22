import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type { MutationReportPaymentFailureArgs, PaymentFailureReceipt } from '@duncit/gql-types';
import { fireAndForget, logs } from '@duncit/logs';
import {
  EMPTY_PAYMENT_FAILURE_STATE,
  classifyPaymentFailure,
  paymentFailureReportInput,
  paymentTicketDraft,
  type PaymentFailure,
  type PaymentFailureContext,
  type PaymentFailureOptions,
  type PaymentFailureState,
  type RazorpayErrorLike,
} from '@duncit/utils';
import { CREATE_TICKET } from '../../pages/support-tickets/queries';
import { REPORT_PAYMENT_FAILURE } from './queries';

// The state, context and options are shared with the other app (@duncit/utils).
export type { PaymentFailureContext, PaymentFailureOptions, PaymentFailureState };

/**
 * What to do when a payment does not complete.
 *
 * Classifying is shared with the native app (@duncit/utils); this only knows
 * how to reach the API. A timed-out payment raises a support ticket on the
 * buyer's behalf, because at that moment they cannot tell whether they have
 * been charged and asking them to go and file one is asking them to chase their
 * own money. With `reportToServer`, every failure is also recorded against the
 * payment — fire-and-forget, so the dialog never waits on it.
 */
export function usePaymentFailure(context: () => PaymentFailureContext, options: PaymentFailureOptions = {}) {
  const { reportToServer = false } = options;
  const [state, setState] = useState<PaymentFailureState>(EMPTY_PAYMENT_FAILURE_STATE);
  const [createTicket] = useMutation<any>(CREATE_TICKET);
  const [recordFailure] = useMutation<
    { reportPaymentFailure: Pick<PaymentFailureReceipt, 'case_id'> },
    MutationReportPaymentFailureArgs
  >(REPORT_PAYMENT_FAILURE);
  // Failures in this checkout on this device — the server reads repeat tries.
  const attempts = useRef(0);

  const record = useCallback(
    (failure: PaymentFailure, ctx: PaymentFailureContext) => {
      attempts.current += 1;
      const input = paymentFailureReportInput(failure, {
        paymentDocId: ctx.paymentDocId,
        razorpayOrderId: ctx.razorpayOrderId,
        retryShown: true,
        attemptNumber: attempts.current,
        clientRequestId: globalThis.crypto.randomUUID(),
      });
      if (!input) return;
      fireAndForget(recordFailure({ variables: { input } }), logs.mWeb, 'PaymentFailure', 'reportPaymentFailure');
    },
    [recordFailure]
  );

  const report = useCallback(
    async (error: RazorpayErrorLike | null) => {
      const failure = classifyPaymentFailure(error);
      const ctx = context();
      setState({ ...EMPTY_PAYMENT_FAILURE_STATE, failure, ticketPending: failure.raisesTicket, paymentDocId: ctx.paymentDocId ?? null });
      if (reportToServer) record(failure, ctx);
      if (!failure.raisesTicket) return;

      try {
        const res = await createTicket({
          variables: { input: paymentTicketDraft(failure, ctx) },
        });
        const ticketNo = res.data?.createTicket?.ticket_no ?? null;
        // A ticket with no number is no reference at all — say so rather than
        // print an empty promise.
        setState((prev) => ({
          ...prev,
          ticketPending: false,
          ticketNo,
          ticketFailed: !ticketNo,
        }));
      } catch {
        setState((prev) => ({ ...prev, ticketPending: false, ticketFailed: true }));
      }
    },
    [createTicket, context, record, reportToServer]
  );

  const dismiss = useCallback(() => setState(EMPTY_PAYMENT_FAILURE_STATE), []);

  return { ...state, report, dismiss };
}
