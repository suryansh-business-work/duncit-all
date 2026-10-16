import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';
import { DELIVERY_ADDRESS_STORAGE_KEY, pickDeliveryAddress } from '@duncit/utils';

import { MyAddressesDocument } from '@/graphql/address-book';
import { graphqlRequest } from '@/services/graphql.client';
import { getItem, setItem } from '@/services/secure-storage';

export type UserAddress = ResultOf<typeof MyAddressesDocument>['myAddresses'][number];

/** The buyer's address book and the address the Pod Shop delivers to — the
 * last one they picked (kept on the device), else their default. Read by the
 * shop's "Deliver to" bar and the checkout's address picker, so a pick in
 * either is the one the other opens with. Skipped while signed out.
 * RN twin of mWeb's useDeliveryAddress. */
export function useDeliveryAddress(enabled = true) {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [pickedId, setPickedId] = useState('');
  // Nothing is chosen until the saved pick is read back, so the checkout never
  // quotes the default first and then the saved address a moment later.
  const [restored, setRestored] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    getItem(DELIVERY_ADDRESS_STORAGE_KEY)
      .then((id) => active && id && setPickedId(id))
      .catch((error: unknown) => logs.mobileApp.warn('useDeliveryAddress', 'read', { error }))
      .finally(() => active && setRestored(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    graphqlRequest(MyAddressesDocument, undefined, { auth: true })
      .then((data) => active && setAddresses(data.myAddresses))
      .catch((error: unknown) => {
        logs.mobileApp.error('useDeliveryAddress', 'loadAddresses', { error });
        if (active) setFailed(true);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [enabled, attempt]);

  const selected = useMemo(
    () => (restored ? pickDeliveryAddress(addresses, pickedId) : null),
    [restored, addresses, pickedId],
  );

  const select = useCallback((id: string) => {
    setPickedId(id);
    setItem(DELIVERY_ADDRESS_STORAGE_KEY, id).catch((error: unknown) =>
      // Storage blocked — the pick still holds for this screen.
      logs.mobileApp.warn('useDeliveryAddress', 'write', { error }),
    );
  }, []);

  return { addresses, selected, select, loading, failed, reload };
}
