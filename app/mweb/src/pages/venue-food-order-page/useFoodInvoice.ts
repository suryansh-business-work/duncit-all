import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { downloadBase64File, foodInvoiceFileName, type VenueFoodOrder } from '@duncit/utils';
import {
  VENUE_FOOD_ORDER_INVOICE,
  type FoodOrderAccessVars,
  type VenueFoodOrderInvoiceData,
} from '../VenueDetailsPage/food/queries';

/**
 * The order's invoice, saved as a PDF. It is drawn on the server each time —
 * never cached here — so a refund that lands later is on the next download.
 * A failure is kept for the card to say; a download that silently did nothing
 * reads as a broken button. Native twin: hooks/useFoodInvoice.
 */
export function useFoodInvoice(order: Readonly<Pick<VenueFoodOrder, 'id' | 'order_no'>>, accessKey: string | null) {
  const client = useApolloClient();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const download = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const { data } = await client.query<VenueFoodOrderInvoiceData, FoodOrderAccessVars>({
        query: VENUE_FOOD_ORDER_INVOICE,
        variables: { orderId: order.id, accessKey },
        fetchPolicy: 'no-cache',
      });
      const pdf = data?.venueFoodOrderInvoicePdfBase64;
      // An empty answer is a failure too: nothing was saved, so the card must say so.
      if (pdf) downloadBase64File(pdf, foodInvoiceFileName(order.order_no), 'application/pdf');
      else setFailed(true);
    } catch (error) {
      logs.mWeb.warn('venueFood', 'downloadInvoice', { error, orderId: order.id });
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return { busy, failed, download };
}
