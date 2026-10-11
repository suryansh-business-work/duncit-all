import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';
import {
  deliveryQuoteRequestKey,
  deliveryQuoteView,
  type DeliveryQuoteStatus,
  type SettledDeliveryQuote,
} from '@duncit/utils';

import { MobileProductShippingQuoteDocument } from '@/graphql/productCheckout';
import { graphqlRequest } from '@/services/graphql.client';
import type { ProductCartItemInput } from '@/generated/graphql/graphql';
import { PINCODE_LOOSE } from '@duncit/regex';

export type ProductShippingQuote = ResultOf<
  typeof MobileProductShippingQuoteDocument
>['productShippingQuote'];

interface Result {
  quote: ProductShippingQuote | null;
  loading: boolean;
  /** Whether the entered pincode is a valid delivery pincode (drives the summary copy). */
  pincodeValid: boolean;
  /** Whether the charge for the cart and pincode ON SCREEN is known — only READY may pay. */
  status: DeliveryQuoteStatus;
  /** Ask again after a failed quote. */
  retry: () => void;
}

/** The last answer, and the cart + pincode it was asked for. A null quote is a failure. */
type Settled = SettledDeliveryQuote<ProductShippingQuote>;

/**
 * Live ShipRocket delivery estimate for the product cart. Refetches whenever the
 * items or the delivery pincode change; only runs once the pincode is valid so
 * the buyer sees a real charge before paying (the server recomputes at checkout).
 * `status` says whether the answer in hand is for what is on screen now.
 * RN twin of mWeb's useProductShippingQuote.
 */
export function useProductShippingQuote(
  items: ProductCartItemInput[],
  deliveryPincode: string,
): Result {
  const [settled, setSettled] = useState<Settled | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pincode = (deliveryPincode || '').trim();
  const pincodeValid = PINCODE_LOOSE.test(pincode);
  const requestKey = deliveryQuoteRequestKey(items, pincode);

  useEffect(() => {
    if (!pincodeValid || items.length === 0) return;
    let active = true;
    setLoading(true);
    graphqlRequest(
      MobileProductShippingQuoteDocument,
      { input: { items, delivery_pincode: pincode } },
      { auth: true },
    )
      .then((data) => active && setSettled({ key: requestKey, quote: data.productShippingQuote }))
      .catch((error: unknown) => {
        // A superseded request is not a failure of the one now on screen.
        if (!active) return;
        logs.mobileApp.warn('product-checkout', 'useProductShippingQuote', { error });
        setSettled({ key: requestKey, quote: null });
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // `requestKey` stands for `items` + `pincode`; `attempt` re-asks on Retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincodeValid, requestKey, attempt]);

  const retry = useCallback(() => {
    setSettled(null);
    setAttempt((value) => value + 1);
  }, []);

  const view = deliveryQuoteView({ hasItems: items.length > 0, pincodeValid, requestKey, settled });

  return { ...view, loading, pincodeValid, retry };
}
