import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import { runAction } from '../../../lib/actions';
import { REFRESH_TRACKING } from '../queries';
import {
  ANSWER_NDR,
  BOOK_SHIPMENT,
  ORDER_REFRESH,
  SET_PARCEL,
  UPDATE_SHIPPING_ADDRESS,
  type NdrAction,
  type ParcelInput,
  type ShippingAddressInput,
} from '../shipping-queries';

/**
 * Every shipping write on one order. Each answers whether it went through;
 * the order page re-reads its shipment block after each.
 */
export function useShipmentActions(id: string) {
  const { t } = useTranslation();
  const [book, bookState] = useMutation(BOOK_SHIPMENT, ORDER_REFRESH);
  const [setParcel, parcelState] = useMutation(SET_PARCEL, ORDER_REFRESH);
  const [updateAddress, addressState] = useMutation(UPDATE_SHIPPING_ADDRESS, ORDER_REFRESH);
  const [answerNdr, ndrState] = useMutation(ANSWER_NDR, ORDER_REFRESH);
  const [refresh, refreshState] = useMutation(REFRESH_TRACKING, ORDER_REFRESH);
  const busy = [bookState, parcelState, addressState, ndrState, refreshState].some((s) => s.loading);

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
  };
}

export type ShipmentActions = ReturnType<typeof useShipmentActions>;
