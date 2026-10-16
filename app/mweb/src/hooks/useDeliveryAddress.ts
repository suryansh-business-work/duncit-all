import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { DELIVERY_ADDRESS_STORAGE_KEY, pickDeliveryAddress } from '@duncit/utils';
import { MY_ADDRESSES } from '../pages/account-page/AddressBookSection';
import type { UserAddress } from '../pages/account-page/address-book-form';

/** Fired on every pick so each mounted reader follows it. */
const PICK_EVENT = 'duncit:delivery-address-picked';

function readPickedId(): string {
  try {
    return localStorage.getItem(DELIVERY_ADDRESS_STORAGE_KEY) ?? '';
  } catch (error) {
    logs.mWeb.warn('useDeliveryAddress', 'read', { error });
    return '';
  }
}

function writePickedId(id: string) {
  try {
    localStorage.setItem(DELIVERY_ADDRESS_STORAGE_KEY, id);
  } catch (error) {
    // Storage full/blocked — the pick still holds for this page.
    logs.mWeb.warn('useDeliveryAddress', 'write', { error });
  }
}

/** The buyer's address book and the address the Pod Shop delivers to — the
 * last one they picked (kept on the device), else their default. Read by the
 * shop header's "Deliver to" pill and the checkout's address picker, so a pick
 * in either is the one the other opens with. Skipped while signed out.
 * Native twin: hooks/useDeliveryAddress. */
export function useDeliveryAddress(enabled = true) {
  const { data, loading, error, refetch } = useQuery<{ myAddresses: UserAddress[] }>(MY_ADDRESSES, {
    skip: !enabled,
    fetchPolicy: 'cache-and-network',
  });
  const [pickedId, setPickedId] = useState(readPickedId);
  const addresses = useMemo(() => data?.myAddresses ?? [], [data]);
  const selected = useMemo(() => pickDeliveryAddress(addresses, pickedId), [addresses, pickedId]);

  useEffect(() => {
    if (error) logs.mWeb.error('useDeliveryAddress', 'loadAddresses', { error });
  }, [error]);

  // A pick in one reader (the header pill) moves every other mounted one — the
  // Pod Shop list re-filters by the new pincode without a reload.
  useEffect(() => {
    const onPick = (event: Event) => setPickedId((event as CustomEvent<string>).detail);
    globalThis.addEventListener(PICK_EVENT, onPick);
    return () => globalThis.removeEventListener(PICK_EVENT, onPick);
  }, []);

  const select = useCallback((id: string) => {
    setPickedId(id);
    writePickedId(id);
    globalThis.dispatchEvent(new CustomEvent(PICK_EVENT, { detail: id }));
  }, []);

  return { addresses, selected, select, loading: loading && !data, error, refetch };
}
