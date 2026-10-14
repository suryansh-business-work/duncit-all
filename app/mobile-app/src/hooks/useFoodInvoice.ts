import { useState } from 'react';
import { logs } from '@duncit/logs';
import { foodInvoiceFileName, type VenueFoodOrder } from '@duncit/utils';

import { shareBase64File } from '@/components/public-page/publicPageRequests';
import { useTranslation } from '@/hooks/useTranslation';
import { fetchFoodInvoiceBase64 } from '@/services/food-order';

/**
 * A paid food order's invoice: fetched as a PDF with the key the order is read
 * with, then handed to the OS share sheet — how this app saves a file (as
 * hooks/useOrderDetail.ts does for a shop order). The app has no toast, so a
 * failure is said in place through `error`.
 */
export function useFoodInvoice(
  order: Pick<VenueFoodOrder, 'id' | 'order_no'>,
  accessKey: string | null,
) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const base64 = await fetchFoodInvoiceBase64(order.id, accessKey);
      const shared = await shareBase64File(
        base64,
        foodInvoiceFileName(order.order_no),
        'application/pdf',
      );
      if (!shared) setError(t('mweb.venueFood.invoice.noShareSheet'));
    } catch (err) {
      logs.mobileApp.error('venueFood', 'downloadInvoice', { error: err, orderId: order.id });
      setError(t('mweb.venueFood.invoice.failed'));
    } finally {
      setDownloading(false);
    }
  };

  return { downloading, error, download };
}
