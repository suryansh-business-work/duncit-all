import { useEffect } from 'react';
import { useLazyQuery } from '@apollo/client';
import { PINCODE_PATTERN } from '../checkout-page/checkout';
import {
  PRODUCT_SHIPPING_QUOTE,
  type ProductCartItemInput,
  type ProductShippingQuote,
} from '../checkout-page/queries';

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
 */
export function useProductShippingQuote(
  items: ProductCartItemInput[],
  deliveryPincode: string,
): Result {
  const [run, { data, loading }] = useLazyQuery(PRODUCT_SHIPPING_QUOTE, { fetchPolicy: 'no-cache' });
  const pincode = (deliveryPincode || '').trim();
  const pincodeValid = PINCODE_PATTERN.test(pincode);
  const itemsKey = JSON.stringify(items);

  useEffect(() => {
    if (!pincodeValid || items.length === 0) return;
    run({ variables: { input: { items, delivery_pincode: pincode } } }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincodeValid, pincode, itemsKey, run]);

  return { quote: data?.productShippingQuote ?? null, loading, pincodeValid };
}
