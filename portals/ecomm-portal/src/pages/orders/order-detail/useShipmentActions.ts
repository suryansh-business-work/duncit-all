import { useMutation } from '@apollo/client/react';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { runAction } from '../../../lib/actions';
import { REFRESH_TRACKING } from '../queries';
import {
  ANSWER_NDR,
  BOOK_SHIPMENT,
  ORDER_REFRESH,
  SET_PARCEL,
  SHIPMENT_DOCUMENT,
  UPDATE_SHIPPING_ADDRESS,
  type NdrAction,
  type ParcelInput,
  type ShipmentDocument,
  type ShippingAddressInput,
} from '../shipping-queries';

/** Open a ShipRocket PDF (label, invoice, manifest) in a new tab. */
export function openDocument(url: string) {
  globalThis.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Every shipping write on one order. Each answers whether it went through;
 * the order page re-reads its shipment block after each.
 */
export function useShipmentActions(id: string) {
  const { t } = useTranslation();
  const [book, bookState] = useMutation(BOOK_SHIPMENT, ORDER_REFRESH);
  const [setParcel, parcelState] = useMutation(SET_PARCEL, ORDER_REFRESH);
  const [updateAddress, addressState] = useMutation(UPDATE_SHIPPING_ADDRESS, ORDER_REFRESH);
  const [makeDocument, documentState] = useMutation(SHIPMENT_DOCUMENT, ORDER_REFRESH);
  const [answerNdr, ndrState] = useMutation(ANSWER_NDR, ORDER_REFRESH);
  const [refresh, refreshState] = useMutation(REFRESH_TRACKING, ORDER_REFRESH);
  const busy = [bookState, parcelState, addressState, documentState, ndrState, refreshState].some((s) => s.loading);

  const document = async (kind: ShipmentDocument) => {
    let url = '';
    const done = await runAction(async () => {
      const result = await makeDocument({ variables: { ids: [id], kind } });
      url = result.data?.storeShipmentDocument ?? '';
    }, t('ecommPortal.shipping.documentReady'));
    if (done && url) openDocument(url);
    else if (done) notifyError(t('ecommPortal.shipping.documentMissing'));
  };

  return {
    busy,
    book: (courierId?: string | null) =>
      runAction(() => book({ variables: { id, courier_id: courierId ?? null } }), t('ecommPortal.shipping.booked')),
    setParcel: (input: ParcelInput | null) =>
      runAction(() => setParcel({ variables: { id, input } }), t('ecommPortal.shipping.parcelSaved')),
    updateAddress: (input: ShippingAddressInput) =>
      runAction(() => updateAddress({ variables: { id, input } }), t('ecommPortal.shipping.addressSaved')),
    answerNdr: (action: NdrAction, comments: string) =>
      runAction(() => answerNdr({ variables: { id, action, comments: comments || null } }), t('ecommPortal.shipping.ndrAnswered')),
    refreshTracking: () => runAction(() => refresh({ variables: { id } }), t('ecommPortal.orders.trackingRefreshed')),
    document,
  };
}

export type ShipmentActions = ReturnType<typeof useShipmentActions>;
