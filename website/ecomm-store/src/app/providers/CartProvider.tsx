import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';

import { ADD_TO_CART, APPLY_COUPON, SET_CART_QTY, STORE_CART, type StoreCart } from '../../graphql/cart';
import { getCartToken } from '../../lib/cartToken';
import { useStoreT } from '../../i18n';

interface CartValue {
  cart: StoreCart | null;
  loading: boolean;
  cartToken: string;
  addToCart: (productId: string, variantId: string, qty: number) => Promise<boolean>;
  setQty: (productId: string, variantId: string, qty: number) => Promise<boolean>;
  /** Apply (or, with '', remove) a coupon. Resolves to the server's refusal, if any. */
  applyCoupon: (code: string) => Promise<string | null>;
  /** Replace the cached cart with one a mutation elsewhere answered with. */
  replaceCart: (next: StoreCart) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  /** The last change, read out by the polite live region in the layout. */
  announcement: string;
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useStoreT();
  const client = useApolloClient();
  const cartToken = getCartToken();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const { data, loading } = useQuery(STORE_CART, { variables: { cart_token: cartToken } });

  const replaceCart = useCallback(
    (next: StoreCart) => {
      client.writeQuery({ query: STORE_CART, variables: { cart_token: cartToken }, data: { storeCart: next } });
    },
    [client, cartToken],
  );

  const addToCart = useCallback(
    async (productId: string, variantId: string, qty: number) => {
      try {
        const variables = { cart_token: cartToken, product_id: productId, variant_id: variantId, qty };
        const result = await client.mutate({ mutation: ADD_TO_CART, variables });
        if (result.data) replaceCart(result.data.storeAddToCart);
        setAnnouncement(t('ecommStore.cart.added'));
        setDrawerOpen(true);
        return true;
      } catch (error) {
        notifyError(parseApiError(error, t('ecommStore.cart.updateFailed')));
        return false;
      }
    },
    [client, cartToken, replaceCart, t],
  );

  const setQty = useCallback(
    async (productId: string, variantId: string, qty: number) => {
      try {
        const variables = { cart_token: cartToken, product_id: productId, variant_id: variantId, qty };
        const result = await client.mutate({ mutation: SET_CART_QTY, variables });
        if (result.data) replaceCart(result.data.storeSetCartQty);
        setAnnouncement(qty > 0 ? t('ecommStore.cart.updated') : t('ecommStore.cart.removed'));
        return true;
      } catch (error) {
        notifyError(parseApiError(error, t('ecommStore.cart.updateFailed')));
        return false;
      }
    },
    [client, cartToken, replaceCart, t],
  );

  const applyCoupon = useCallback(
    async (code: string) => {
      try {
        const result = await client.mutate({ mutation: APPLY_COUPON, variables: { cart_token: cartToken, code } });
        if (result.data) replaceCart(result.data.storeApplyCoupon);
        setAnnouncement(code ? t('ecommStore.cart.couponApplied') : t('ecommStore.cart.couponRemoved'));
        return null;
      } catch (error) {
        return parseApiError(error, t('ecommStore.cart.updateFailed'));
      }
    },
    [client, cartToken, replaceCart, t],
  );

  const value = useMemo<CartValue>(
    () => ({
      cart: data?.storeCart ?? null,
      loading,
      cartToken,
      addToCart,
      setQty,
      applyCoupon,
      replaceCart,
      drawerOpen,
      setDrawerOpen,
      announcement,
    }),
    [data, loading, cartToken, addToCart, setQty, applyCoupon, replaceCart, drawerOpen, announcement],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart needs a CartProvider');
  return value;
}
