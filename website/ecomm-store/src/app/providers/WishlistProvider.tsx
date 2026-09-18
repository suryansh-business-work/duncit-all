import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';

import { STORE_WISHLIST_IDS, TOGGLE_WISHLIST } from '../../graphql/catalog';
import { getCartToken } from '../../lib/cartToken';
import { useStoreT } from '../../i18n';

interface WishlistValue {
  ids: ReadonlySet<string>;
  count: number;
  toggle: (productId: string) => Promise<void>;
  announcement: string;
}

const WishlistContext = createContext<WishlistValue | null>(null);

/** Saved products — the account's when signed in, the browser's cart token's otherwise. */
export function WishlistProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useStoreT();
  const client = useApolloClient();
  const cartToken = getCartToken();
  const [announcement, setAnnouncement] = useState('');
  const { data } = useQuery(STORE_WISHLIST_IDS, {
    variables: { cart_token: cartToken },
  });
  const ids = useMemo(() => new Set(data?.storeWishlistIds ?? []), [data]);

  const toggle = useCallback(
    async (productId: string) => {
      const wasSaved = ids.has(productId);
      try {
        const result = await client.mutate({
          mutation: TOGGLE_WISHLIST,
          variables: { cart_token: cartToken, product_id: productId },
          refetchQueries: ['EcommStoreWishlist'],
        });
        client.writeQuery({
          query: STORE_WISHLIST_IDS,
          variables: { cart_token: cartToken },
          data: { storeWishlistIds: result.data?.storeToggleWishlist ?? [] },
        });
        setAnnouncement(wasSaved ? t('ecommStore.wishlist.removed') : t('ecommStore.wishlist.added'));
      } catch (error) {
        notifyError(parseApiError(error, t('ecommStore.wishlist.failed')));
      }
    },
    [client, cartToken, ids, t],
  );

  const value = useMemo(() => ({ ids, count: ids.size, toggle, announcement }), [ids, toggle, announcement]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistValue {
  const value = useContext(WishlistContext);
  if (!value) throw new Error('useWishlist needs a WishlistProvider');
  return value;
}
