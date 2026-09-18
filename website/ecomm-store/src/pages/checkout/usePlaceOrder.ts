import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { classifyPaymentFailure, parseApiError } from '@duncit/utils';

import { useCart } from '../../app/providers/CartProvider';
import { DIAL_CODE } from '../../config/env';
import { STORE_CART } from '../../graphql/cart';
import { PLACE_ORDER, VERIFY_PAYMENT, type StorePlaceOrderResult } from '../../graphql/checkout';
import { toStoreAddress } from '../../lib/addresses';
import { paths } from '../../lib/paths';
import { payWithRazorpay, RazorpayFailure } from '../../lib/razorpay';
import { useStoreT } from '../../i18n';
import type { CheckoutControls } from './useCheckoutState';

const FAILURE_KEYS = {
  CANCELLED: 'ecommStore.payment.cancelled',
  TIMEOUT: 'ecommStore.payment.timeout',
  FAILED: 'ecommStore.payment.failed',
} as const;

/**
 * Place the order; when the server hands back a Razorpay sheet, open it and
 * verify its signature. Every path ends on the confirmation page — or with a
 * message saying exactly why it did not.
 */
export function usePlaceOrder(controls: CheckoutControls, couponCode: string, redeemCoins: number) {
  const { t } = useStoreT();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { cartToken } = useCart();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [placeOrder] = useMutation(PLACE_ORDER);
  const [verifyPayment] = useMutation(VERIFY_PAYMENT);

  /** Leave checkout first, so the now-empty cart never flashes its empty state here. */
  const finish = async (result: StorePlaceOrderResult) => {
    navigate(paths.orderSuccess(result.payment_doc_id, result.access_key));
    await client.refetchQueries({ include: [STORE_CART] });
  };

  const payOnline = async (placed: StorePlaceOrderResult) => {
    if (!placed.razorpay) {
      await finish(placed);
      return;
    }
    try {
      const signature = await payWithRazorpay(placed.razorpay);
      const verified = await verifyPayment({
        variables: { input: { payment_doc_id: placed.payment_doc_id, ...signature, cart_token: cartToken, access_key: placed.access_key } },
      });
      await finish(verified.data?.storeVerifyPayment ?? placed);
    } catch (err) {
      if (!(err instanceof RazorpayFailure)) throw err;
      setError(t(FAILURE_KEYS[classifyPaymentFailure(err.detail).kind]));
    }
  };

  const place = async () => {
    const { contact, address, method, codChallenge } = controls.state;
    if (!contact || !address) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await placeOrder({
        variables: {
          input: {
            cart_token: cartToken,
            payment_method: method,
            coupon_code: couponCode || undefined,
            redeem_coins: redeemCoins,
            contact: { name: contact.name, email: contact.email, phone_extension: DIAL_CODE, phone_number: contact.phone },
            shipping_address: toStoreAddress(address, contact.email),
            billing_same_as_shipping: true,
            cod_challenge_id: method === 'COD' ? codChallenge?.id : undefined,
            autoship_id: controls.autoshipId,
            checkout_url: globalThis.location.href,
          },
        },
      });
      if (data) await payOnline(data.storePlaceOrder);
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.checkout.placeFailed')));
    } finally {
      setBusy(false);
    }
  };

  return { place, busy, error };
}
