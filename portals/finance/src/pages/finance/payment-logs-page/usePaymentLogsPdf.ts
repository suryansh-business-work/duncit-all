import { useCallback, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { format } from 'date-fns';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { downloadBase64File } from '@duncit/utils';
import { PAYMENT_LOGS_PDF, type PaymentShop } from './queries';

/** `payment-logs-2026-11-23.pdf`; a shop's log names its shop so the two never share a file name. */
const FILE_PREFIX: Record<PaymentShop, string> = {
  POD_SHOP: 'pod-shop-payment-logs',
  ECOMM: 'ecomm-payment-logs',
};

interface Options {
  shop?: PaymentShop;
  /** Where a failure is shown (the page's own alert); null clears it. */
  onError: (message: string | null) => void;
}

/**
 * Export PDF for Payment Logs.
 *
 * The PDF is the table as it is NOW: `remember` is called with every query the
 * table runs, so the export asks the server for exactly that search, those
 * filters and that sort — never a re-typed copy that could drift from the screen.
 * The server fixes the shop's scope and caps the row count; this only asks.
 */
export function usePaymentLogsPdf({ shop, onError }: Readonly<Options>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const lastQuery = useRef<TableQueryState | null>(null);
  const [exporting, setExporting] = useState(false);

  const remember = useCallback((state: TableQueryState) => {
    lastQuery.current = state;
  }, []);

  const exportPdf = useCallback(async () => {
    onError(null);
    setExporting(true);
    try {
      const state = lastQuery.current;
      const { data } = await client.query<{ paymentLogsPdfBase64?: string | null }>({
        query: PAYMENT_LOGS_PDF,
        variables: { ...(state ? tableQueryToGql(state) : {}), ...(shop ? { shop } : {}) },
        fetchPolicy: 'network-only',
      });
      const base64 = data?.paymentLogsPdfBase64;
      if (!base64) throw new Error(t('finance.payment.exportPdfUnavailable'));
      const prefix = shop ? FILE_PREFIX[shop] : 'payment-logs';
      downloadBase64File(base64, `${prefix}-${format(new Date(), 'yyyy-MM-dd')}.pdf`, 'application/pdf');
    } catch (error) {
      // Apollo rejects with an Error carrying the server's message.
      onError(error instanceof Error && error.message ? error.message : t('finance.payment.exportPdfFailed'));
    } finally {
      setExporting(false);
    }
  }, [client, onError, shop, t]);

  return { exporting, exportPdf, remember };
}
