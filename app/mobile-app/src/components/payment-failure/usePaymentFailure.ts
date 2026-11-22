import { useCallback, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
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

import { createTicket } from '@/hooks/useSupport';
import { recordPaymentFailure } from './paymentFailureApi';

// The state, context and options are shared with the other app (@duncit/utils).
export type { PaymentFailureContext, PaymentFailureOptions, PaymentFailureState };

/**
 * What to do when a payment does not complete.
 *
 * The RN twin of mWeb's hook (rule 27) — classifying, the ticket's wording and
 * the server report are shared (@duncit/utils), only the API call differs. A
 * timed-out payment raises a support ticket on the buyer's behalf, because at
 * that moment they cannot tell whether they have been charged. With
 * `reportToServer`, every failure is also recorded against the payment —
 * fire-and-forget, so the dialog never waits on it.
 */
export function usePaymentFailure(
  context: () => PaymentFailureContext,
  options: PaymentFailureOptions = {},
) {
  const { reportToServer = false } = options;
  const [state, setState] = useState<PaymentFailureState>(EMPTY_PAYMENT_FAILURE_STATE);
  // Failures in this checkout on this device — the server reads repeat tries.
  const attempts = useRef(0);

  const record = useCallback((failure: PaymentFailure, ctx: PaymentFailureContext) => {
    attempts.current += 1;
    const input = paymentFailureReportInput(failure, {
      paymentDocId: ctx.paymentDocId,
      razorpayOrderId: ctx.razorpayOrderId,
      retryShown: true,
      attemptNumber: attempts.current,
      clientRequestId: randomUUID(),
    });
    if (!input) return;
    fireAndForget(
      recordPaymentFailure(input),
      logs.mobileApp,
      'PaymentFailure',
      'reportPaymentFailure',
    );
  }, []);

  const report = useCallback(
    async (error: RazorpayErrorLike | null) => {
      const failure = classifyPaymentFailure(error);
      const ctx = context();
      setState({
        ...EMPTY_PAYMENT_FAILURE_STATE,
        failure,
        ticketPending: failure.raisesTicket,
        paymentDocId: ctx.paymentDocId ?? null,
      });
      if (reportToServer) record(failure, ctx);
      if (!failure.raisesTicket) return;

      try {
        const draft = paymentTicketDraft(failure, ctx);
        const ticket = await createTicket(
          draft.subject,
          draft.body_text,
          draft.category,
          [],
          undefined,
          draft.payment_id,
        );
        // A ticket with no number is no reference at all — say so rather than
        // print an empty promise.
        setState((prev) => ({
          ...prev,
          ticketPending: false,
          ticketNo: ticket.ticketNo,
          ticketFailed: !ticket.ticketNo,
        }));
      } catch {
        setState((prev) => ({ ...prev, ticketPending: false, ticketFailed: true }));
      }
    },
    [context, record, reportToServer],
  );

  const dismiss = useCallback(() => setState(EMPTY_PAYMENT_FAILURE_STATE), []);

  return { ...state, report, dismiss };
}
