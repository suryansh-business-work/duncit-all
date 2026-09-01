import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  classifyPaymentFailure,
  paymentTicketDraft,
  type PaymentFailure,
  type PaymentTicketContext,
  type RazorpayErrorLike,
} from '@duncit/utils';
import { CREATE_TICKET } from '../../pages/support-tickets/queries';

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
 * Classifying is shared with the native app (@duncit/utils); this only knows
 * how to reach the API. A timed-out payment raises a support ticket on the
 * buyer's behalf, because at that moment they cannot tell whether they have
 * been charged and asking them to go and file one is asking them to chase their
 * own money.
 */
export function usePaymentFailure(context: () => PaymentTicketContext) {
  const [state, setState] = useState<PaymentFailureState>(EMPTY);
  const [createTicket] = useMutation<any>(CREATE_TICKET);

  const report = useCallback(
    async (error: RazorpayErrorLike | null) => {
      const failure = classifyPaymentFailure(error);
      setState({ ...EMPTY, failure, ticketPending: failure.raisesTicket });
      if (!failure.raisesTicket) return;

      try {
        const res = await createTicket({
          variables: { input: paymentTicketDraft(failure, context()) },
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
    [createTicket, context]
  );

  const dismiss = useCallback(() => setState(EMPTY), []);

  return { ...state, report, dismiss };
}
