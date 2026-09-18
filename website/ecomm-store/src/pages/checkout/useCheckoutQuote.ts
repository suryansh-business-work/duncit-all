import { useQuery } from '@apollo/client/react';

import { useCart } from '../../app/providers/CartProvider';
import { useStoreSession } from '../../app/providers/SessionProvider';
import { MY_COIN_BALANCE } from '../../graphql/account';
import { CHECKOUT_QUOTE } from '../../graphql/cart';
import type { CheckoutControls } from './useCheckoutState';

/**
 * The live price of this checkout. It re-asks the server whenever the pincode,
 * the payment method, the coupon on the cart or the coins toggle changes, so
 * the total on screen is always the total that will be charged.
 */
export function useCheckoutQuote(controls: CheckoutControls) {
  const { cartToken, cart } = useCart();
  const { signedIn } = useStoreSession();
  const { state, autoshipId } = controls;
  const coins = useQuery(MY_COIN_BALANCE, { skip: !signedIn });
  const balance = Math.floor(coins.data?.myCoinBalance.balance ?? 0);
  const quote = useQuery(CHECKOUT_QUOTE, {
    variables: {
      input: {
        cart_token: cartToken,
        pincode: state.address?.pincode,
        payment_method: state.method,
        coupon_code: cart?.coupon_code || undefined,
        redeem_coins: state.useCoins ? balance : 0,
        email: state.contact?.email,
        autoship_id: autoshipId,
      },
    },
    skip: !cart || cart.item_count === 0,
    fetchPolicy: 'cache-and-network',
  });
  return {
    quote: (quote.data ?? quote.previousData)?.storeCheckoutQuote ?? null,
    loading: quote.loading,
    error: quote.error,
    coinBalance: balance,
    refetchCoins: () => coins.refetch(),
  };
}

export type CheckoutQuoteState = ReturnType<typeof useCheckoutQuote>;
