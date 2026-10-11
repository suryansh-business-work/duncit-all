import { useLazyQuery, useMutation } from '@apollo/client/react';
import { downloadBase64File, parseApiError } from '@duncit/utils';
import { notifyError } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import { POD_HISTORY_INVOICE_PDF } from '../pod-history-page/queries';
import { MY_ORDER_SELLER_INVOICE, type OrderDetail } from './queries';

const PDF = 'application/pdf';

/**
 * The two documents an order offers, each saved as a PDF: Duncit's invoice for
 * the payment (the same query the booking pages use) and the seller's tax
 * invoice for the shipment. A refusal — no invoice yet, courier unreachable —
 * is said in the server's own words. Native twin: useOrderDetail.
 */
export function useOrderDownloads(order: Readonly<Pick<OrderDetail, 'id' | 'order_no' | 'payment_id'>>) {
  const { t } = useTranslation();
  const [loadInvoice, invoice] = useLazyQuery<{ paymentInvoicePdfBase64?: string | null }, { id: string }>(
    POD_HISTORY_INVOICE_PDF,
    { fetchPolicy: 'network-only' },
  );
  const [loadSellerInvoice, sellerInvoice] = useMutation(MY_ORDER_SELLER_INVOICE);
  const failed = (error: unknown) => notifyError(parseApiError(error, t('mweb.orderDetail.downloadFailed')));

  return {
    invoiceBusy: invoice.loading,
    sellerInvoiceBusy: sellerInvoice.loading,
    downloadInvoice: async () => {
      try {
        // A refusal rejects (errorPolicy none), so the catch below says it in the server's words.
        const { data } = await loadInvoice({ variables: { id: order.payment_id } });
        const base64 = data?.paymentInvoicePdfBase64;
        if (!base64) throw new Error(t('mweb.checkout.errorInvoiceUnavailable'));
        downloadBase64File(base64, `invoice-${order.order_no}.pdf`, PDF);
      } catch (error) {
        failed(error);
      }
    },
    downloadSellerInvoice: async () => {
      try {
        const { data } = await loadSellerInvoice({ variables: { id: order.id } });
        const file = data?.myProductOrderSellerInvoice;
        if (!file?.content_base64) throw new Error(t('mweb.orderDetail.downloadFailed'));
        downloadBase64File(file.content_base64, `seller-${file.filename}`, file.mime);
      } catch (error) {
        failed(error);
      }
    },
  };
}
