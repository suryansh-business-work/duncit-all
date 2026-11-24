import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { placeChargesTicketDraft, type PodPlaceCharge } from '@duncit/utils';
import { CREATE_TICKET } from '../../support-tickets/queries';

export interface PlaceChargesPod {
  id: string;
  pod_title?: string | null;
  place_charges?: readonly PodPlaceCharge[] | null;
}

export interface PlaceChargesReport {
  status: 'idle' | 'pending' | 'done' | 'failed';
  ticketNo: string | null;
}

interface CreateTicketResult {
  createTicket: { id: string; ticket_no: string } | null;
}

const IDLE: PlaceChargesReport = { status: 'idle', ticketNo: null };

/**
 * Join / Book on a pod with place charges first asks the member to accept
 * them: they are paid to the venue, at the venue, and Duncit has no part in
 * them. `confirmFirst(book)` wraps a booking action so it runs only on "I'm OK";
 * a pod with no charges books straight away. The dialog's "Report to support"
 * opens a ticket in one tap — once: the button becomes the ticket number.
 * Native twin: components/details/place-charges/usePlaceChargesConfirm.
 */
export function usePlaceChargesConfirm(pod: PlaceChargesPod | null | undefined, currency: string) {
  const [pendingBook, setPendingBook] = useState<(() => void) | null>(null);
  const [report, setReport] = useState<PlaceChargesReport>(IDLE);
  // A second tap while the first is still with the server must not open a
  // second ticket; state alone updates too late to stop it.
  const inFlight = useRef(false);
  const [createTicket] = useMutation<CreateTicketResult>(CREATE_TICKET, {
    refetchQueries: ['MyTickets'],
  });
  const charges = pod?.place_charges ?? [];

  // The setter takes an updater, so the action is wrapped to be stored as-is.
  const confirmFirst = (book: () => void) => () =>
    charges.length > 0 ? setPendingBook(() => book) : book();

  const onAccept = () => {
    const book = pendingBook;
    setPendingBook(null);
    book?.();
  };

  const onReport = async () => {
    if (!pod || inFlight.current || report.status === 'done') return;
    inFlight.current = true;
    setReport({ status: 'pending', ticketNo: null });
    try {
      const input = placeChargesTicketDraft({
        podId: pod.id,
        podTitle: pod.pod_title ?? '',
        charges,
        currencySymbol: currency,
      });
      const { data } = await createTicket({ variables: { input } });
      const ticketNo = data?.createTicket?.ticket_no ?? null;
      setReport(ticketNo ? { status: 'done', ticketNo } : { status: 'failed', ticketNo: null });
    } catch (error) {
      logs.mWeb.error('PodDetails', 'reportPlaceCharges', { error, podId: pod.id });
      setReport({ status: 'failed', ticketNo: null });
    } finally {
      inFlight.current = false;
    }
  };

  return {
    confirmFirst,
    dialog: {
      open: pendingBook !== null,
      charges,
      currency,
      report,
      onAccept,
      onCancel: () => setPendingBook(null),
      onReport,
    },
  };
}

export type PlaceChargesDialogProps = ReturnType<typeof usePlaceChargesConfirm>['dialog'];
