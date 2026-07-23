import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobileProductShippingQuoteDocument } from '@/graphql/productCheckout';
import { graphqlRequest } from '@/services/graphql.client';
import type { ProductCartItemInput } from '@/generated/graphql/graphql';

export type ProductShippingQuote = ResultOf<
  typeof MobileProductShippingQuoteDocument
>['productShippingQuote'];

/** Mirrors the server delivery-pincode rule (4–10 digits). */
const PINCODE_PATTERN = /^\d{4,10}$/;

interface Result {
  quote: ProductShippingQuote | null;
  loading: boolean;
  /** Whether the entered pincode is a valid delivery pincode (drives the summary copy). */
  pincodeValid: boolean;
}

/**
 * Live ShipRocket delivery estimate for the product cart. Refetches whenever the
 * items or the delivery pincode change; only runs once the pincode is valid so
 * the buyer sees a real charge before paying (the server recomputes at checkout).
 * RN twin of mWeb's useProductShippingQuote.
 */
export function useProductShippingQuote(
  items: ProductCartItemInput[],
  deliveryPincode: string,
): Result {
  const [quote, setQuote] = useState<ProductShippingQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const pincode = (deliveryPincode || '').trim();
  const pincodeValid = PINCODE_PATTERN.test(pincode);
  const itemsKey = JSON.stringify(items);

  useEffect(() => {
    if (!pincodeValid || items.length === 0) return;
    let active = true;
    setLoading(true);
    graphqlRequest(
      MobileProductShippingQuoteDocument,
      { input: { items, delivery_pincode: pincode } },
      { auth: true },
    )
      .then((data) => active && setQuote(data.productShippingQuote))
      .catch(() => active && setQuote(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincodeValid, pincode, itemsKey]);

  return { quote, loading, pincodeValid };
}
