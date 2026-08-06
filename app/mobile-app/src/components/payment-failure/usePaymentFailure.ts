import { useCallback, useState } from 'react';
import {
  classifyPaymentFailure,
  paymentTicketDraft,
  type PaymentFailure,
  type PaymentTicketContext,
  type RazorpayErrorLike,
} from '@duncit/utils';

import { createTicket } from '@/hooks/useSupport';

export interface PaymentFailureState {
  failure: PaymentFailure | null;
  /** The reference to show. Null while it is still being raised. */
  ticketNo: string | null;
  ticketPending: boolean;
  ticketFailed: boolean;
}

const EMPTY: PaymentFailureState = {
  failure: null,
  ticketNo: null,
  ticketPending: false,
  ticketFailed: false,
};

/**
 * What to do when a payment does not complete.
 *
 * The RN twin of mWeb's hook (rule 27) — classifying and the ticket's wording
 * are shared (@duncit/utils), only the API call differs. A timed-out payment
 * raises a support ticket on the buyer's behalf, because at that moment they
 * cannot tell whether they have been charged and asking them to file one is
 * asking them to chase their own money.
 */
export function usePaymentFailure(context: () => PaymentTicketContext) {
  const [state, setState] = useState<PaymentFailureState>(EMPTY);

  const report = useCallback(
    async (error: RazorpayErrorLike | null) => {
      const failure = classifyPaymentFailure(error);
      setState({ ...EMPTY, failure, ticketPending: failure.raisesTicket });
      if (!failure.raisesTicket) return;

      try {
        const draft = paymentTicketDraft(failure, context());
        const ticket = await createTicket(draft.subject, draft.body_text, draft.category);
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
    [context],
  );

  const dismiss = useCallback(() => setState(EMPTY), []);

  return { ...state, report, dismiss };
}
