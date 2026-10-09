import { useMutation } from '@apollo/client/react';
import { downloadBase64File, parseApiError, printBase64File } from '@duncit/utils';
import { notifyError, notifySuccess } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import {
  BRAND_BOOK_SHIPMENT,
  BRAND_REFRESH_TRACKING,
  BRAND_SHIPMENT_FILE,
  BRAND_UPDATE_ADDRESS,
  type BrandOrderDetail,
  type ShipmentFileKind,
  type ShipToInput,
} from '../brand-orders-page/queries';
import type { ShipToFormValues } from './ship-to-form';

/**
 * What the brand can do with one order, each ending in a toast. The mutations
 * answer with the order, which Apollo writes over the cached one, so the page
 * re-renders on the new state without a refetch. Native twin: useBrandOrder.
 */
export function useBrandOrderActions(order: Readonly<BrandOrderDetail>) {
  const { t } = useTranslation();
  const [book, booking] = useMutation(BRAND_BOOK_SHIPMENT);
  const [refresh, refreshing] = useMutation(BRAND_REFRESH_TRACKING);
  const [update, updating] = useMutation(BRAND_UPDATE_ADDRESS);
  const [file, fetchingFile] = useMutation(BRAND_SHIPMENT_FILE);
  const failed = (error: unknown) => notifyError(parseApiError(error, t('mweb.brandOrders.actionFailed')));
  const variables = { id: order.id };

  return {
    busy: booking.loading || refreshing.loading || updating.loading || fetchingFile.loading,
    saving: updating.loading,
    /** A booking that stopped part-way answers with the order and its reason, not an error. */
    book: async () => {
      try {
        const { data } = await book({ variables });
        const stopped = data?.brandBookProductOrderShipment.last_error;
        if (stopped) notifyError(t('mweb.brandOrders.bookingFailed', { vars: { error: stopped } }));
        else notifySuccess(t('mweb.brandOrders.booked'));
      } catch (error) {
        failed(error);
      }
    },
    refreshTracking: async () => {
      try {
        await refresh({ variables });
        notifySuccess(t('mweb.brandOrders.trackingRefreshed'));
      } catch (error) {
        failed(error);
      }
    },
    /** True once saved, so the dialog closes only on success. */
    saveAddress: async (values: ShipToFormValues): Promise<boolean> => {
      const address: ShipToInput = { ...values, email: order.shipping_address?.email ?? '' };
      try {
        await update({ variables: { ...variables, address } });
        notifySuccess(t('mweb.brandOrders.addressSaved'));
        return true;
      } catch (error) {
        failed(error);
        return false;
      }
    },
    /** A label, invoice or manifest PDF — printed in place, or saved under its own name. */
    document: async (kind: ShipmentFileKind, mode: 'print' | 'download') => {
      try {
        const { data } = await file({ variables: { ids: [order.id], kind } });
        const doc = data?.brandProductOrderShipmentFile;
        if (!doc?.content_base64) throw new Error(t('mweb.brandOrders.actionFailed'));
        if (mode === 'print') printBase64File(doc.content_base64, doc.mime, doc.filename);
        else downloadBase64File(doc.content_base64, doc.filename, doc.mime);
      } catch (error) {
        failed(error);
      }
    },
  };
}
