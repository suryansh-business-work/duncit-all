import { useCallback, useEffect, useState } from 'react';
import { useLazyQuery } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import {
  deliveryQuoteRequestKey,
  deliveryQuoteView,
  type DeliveryQuoteStatus,
  type SettledDeliveryQuote,
} from '@duncit/utils';
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
 */
export function useProductShippingQuote(
  items: ProductCartItemInput[],
  deliveryPincode: string,
): Result {
  const [run, { loading }] = useLazyQuery<{ productShippingQuote: ProductShippingQuote | null }>(
    PRODUCT_SHIPPING_QUOTE,
    { fetchPolicy: 'no-cache' },
  );
  const [settled, setSettled] = useState<Settled | null>(null);
  const [attempt, setAttempt] = useState(0);
  const pincode = (deliveryPincode || '').trim();
  const pincodeValid = PINCODE_PATTERN.test(pincode);
  const requestKey = deliveryQuoteRequestKey(items, pincode);

  useEffect(() => {
    if (!pincodeValid || items.length === 0) return undefined;
    let active = true;
    run({ variables: { input: { items, delivery_pincode: pincode } } })
      .then((result) => {
        if (active) setSettled({ key: requestKey, quote: result.data?.productShippingQuote ?? null });
      })
      .catch((error: unknown) => {
        // A superseded request is not a failure of the one now on screen.
        if (!active) return;
        logs.mWeb.warn('product-checkout', 'useProductShippingQuote', { error });
        setSettled({ key: requestKey, quote: null });
      });
    return () => {
      active = false;
    };
    // `requestKey` stands for `items` + `pincode`; `attempt` re-asks on Retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincodeValid, requestKey, attempt, run]);

  const retry = useCallback(() => {
    setSettled(null);
    setAttempt((value) => value + 1);
  }, []);

  const view = deliveryQuoteView({ hasItems: items.length > 0, pincodeValid, requestKey, settled });

  return { ...view, loading, pincodeValid, retry };
}
