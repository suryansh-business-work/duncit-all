import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { downloadBase64File, printBase64File } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  BOOK_GIFT_CARD_ORDER_SHIPMENT,
  GIFT_CARD_ORDER_LABEL_FILE,
  MARK_GIFT_CARD_ORDER_PRINTED,
  REFRESH_GIFT_CARD_ORDER_TRACKING,
  UPDATE_GIFT_CARD_ORDER_ADDRESS,
} from './queries';
import type { OrderAddressValues } from './order-address';

const PDF = 'application/pdf';

/** The server says exactly why (not paid, address incomplete, wallet low); the fallback covers a dropped connection. */
const messageOf = (e: unknown, fallback: string) => (e as { message?: string })?.message || fallback;

/**
 * The console's fulfilment actions on one order — printed, book the courier,
 * pull tracking now, the label, and fixing the address — each refetching the
 * order (and its history) once it lands.
 */
export function useOrderActions(id: string, orderNo: string, refetch: () => Promise<unknown>) {
  const { t } = useTranslation();
  const [addressError, setAddressError] = useState<string | null>(null);
  const [markPrinted, printing] = useMutation(MARK_GIFT_CARD_ORDER_PRINTED);
  const [book, booking] = useMutation(BOOK_GIFT_CARD_ORDER_SHIPMENT);
  const [refresh, refreshing] = useMutation(REFRESH_GIFT_CARD_ORDER_TRACKING);
  const [saveAddress, savingAddress] = useMutation(UPDATE_GIFT_CARD_ORDER_ADDRESS);
  const [label, fetchingLabel] = useMutation<{ giftCardOrderLabelFile: string }>(GIFT_CARD_ORDER_LABEL_FILE);

  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      notifySuccess(done);
    } catch (e) {
      notifyError(messageOf(e, t('loyalty.giftOrders.actionError')));
    } finally {
      await refetch();
    }
  };

  const labelFile = async (mode: 'print' | 'download') => {
    try {
      const res = await label({ variables: { id } });
      const base64 = res.data?.giftCardOrderLabelFile;
      if (!base64) throw new Error(t('loyalty.giftOrders.labelError'));
      if (mode === 'print') printBase64File(base64, PDF, orderNo);
      else downloadBase64File(base64, `${orderNo}-label.pdf`, PDF);
    } catch (e) {
      notifyError(messageOf(e, t('loyalty.giftOrders.labelError')));
    }
  };

  /** True once saved, so the dialog can close. */
  const updateAddress = async (values: OrderAddressValues): Promise<boolean> => {
    setAddressError(null);
    try {
      await saveAddress({ variables: { id, input: values } });
      notifySuccess(t('loyalty.giftOrders.addressSaved'));
      await refetch();
      return true;
    } catch (e) {
      setAddressError(messageOf(e, t('loyalty.giftOrders.actionError')));
      return false;
    }
  };

  return {
    busy: printing.loading || booking.loading || refreshing.loading || fetchingLabel.loading,
    markPrinted: () => run(() => markPrinted({ variables: { id } }), t('loyalty.giftOrders.printedDone')),
    book: () => run(() => book({ variables: { id } }), t('loyalty.giftOrders.bookedDone')),
    refresh: () => run(() => refresh({ variables: { id } }), t('loyalty.giftOrders.refreshedDone')),
    printLabel: () => labelFile('print'),
    downloadLabel: () => labelFile('download'),
    updateAddress,
    savingAddress: savingAddress.loading,
    addressError,
    clearAddressError: () => setAddressError(null),
  };
}
