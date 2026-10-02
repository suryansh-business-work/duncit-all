import { useLazyQuery } from '@apollo/client/react';
import { notify } from '../../../components/notify';
import { parseApiError } from '../../../utils/parseApiError';
import type { Translate } from '../../../i18n/fallback';
import {
  POD_HISTORY_INVOICE_PDF,
  POD_HISTORY_TICKET_FOR_POD,
  POD_HISTORY_TICKET_PDF,
  type PodHistoryItem,
} from '../queries';

/** The invoice and ticket PDF downloads offered on a booking. */
export function usePodHistoryDownloads(item: PodHistoryItem, t: Translate) {
  const [loadInvoice, invoiceState] = useLazyQuery<any>(POD_HISTORY_INVOICE_PDF, { fetchPolicy: 'network-only' });
  const [loadTicketForPod] = useLazyQuery<any>(POD_HISTORY_TICKET_FOR_POD, { fetchPolicy: 'network-only' });
  const [loadTicketPdf, ticketState] = useLazyQuery<any>(POD_HISTORY_TICKET_PDF, { fetchPolicy: 'network-only' });
  const pod = item.pod;

  const downloadInvoice = async () => {
    if (!item.payment_id) return;
    try {
      const { data } = await loadInvoice({ variables: { id: item.payment_id } });
      const b64 = data?.paymentInvoicePdfBase64;
      if (!b64) throw new Error(t('mweb.checkout.errorInvoiceUnavailable'));
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${b64}`;
      link.download = `pod-invoice-${item.payment_id}.pdf`;
      link.click();
    } catch (error) {
      notify(parseApiError(error), 'error');
    }
  };

  const downloadTicket = async () => {
    if (!pod?.id) return;
    try {
      const { data: tData } = await loadTicketForPod({ variables: { podId: pod.id } });
      const ticket = tData?.myEventTicketForPod;
      if (!ticket?.id) throw new Error(t('mweb.podHistory.ticketNotAvailableForBooking'));
      const { data } = await loadTicketPdf({ variables: { id: ticket.id } });
      const b64 = data?.eventTicketPdfBase64;
      if (!b64) throw new Error(t('mweb.checkout.errorTicketUnavailable'));
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${b64}`;
      link.download = `ticket-and-invoice-${ticket.ticket_code}.pdf`;
      link.click();
    } catch (error) {
      notify(parseApiError(error), 'error');
    }
  };

  return { invoiceState, ticketState, downloadInvoice, downloadTicket };
}
