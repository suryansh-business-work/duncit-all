import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { useCart, type CartLine } from '../../components/cart/CartContext';
import { notify } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import { PODS_FOR_PRODUCT } from '../ProductDetailPage';
import type { ShopProduct } from './queries';

interface PodOption {
  pod_id: string;
  pod_title: string;
  club_slug: string;
  product_name: string;
  unit_cost: number;
  available_count: number;
  free_delivery_above: number | null;
  image_url: string;
}

const byCost = (a: { unit_cost: number }, b: { unit_cost: number }) => a.unit_cost - b.unit_cost;

/** The cart line a product's card speaks for: its base product (no variant),
 * and the cheapest one when more than one pod's shop put it in the cart —
 * the same pod a first quick-add would have picked. */
export function quickAddLine(lines: ReadonlyArray<CartLine>, productId: string): CartLine | undefined {
  return lines.filter((line) => line.product_id === productId && line.variant_id === '').sort(byCost)[0];
}

/** The shop grid's cart control, without opening the product: `lineOf` is what
 * a card shows, `setQuantity` is one step on it. The first unit resolves the
 * cheapest live pod that stocks the product (podsForProduct) and adds the base
 * product through it; every later step stays on that line's pod and never goes
 * past its stock. Tells the buyer when no live pod stocks it, when the cart
 * already holds all the stock, or when the lookup fails. `addingId` is the card
 * whose lookup is in flight. Twin of the mobile app's useQuickAddToCart. */
export function useQuickAddToCart() {
  const client = useApolloClient();
  const { t } = useTranslation();
  const { lines, setLine } = useCart();
  const [addingId, setAddingId] = useState<string | null>(null);

  const lineOf = (productId: string) => quickAddLine(lines, productId);

  const add = async (product: ShopProduct) => {
    setAddingId(product.id);
    try {
      const { data } = await client.query<{ podsForProduct: PodOption[] }>({
        query: PODS_FOR_PRODUCT,
        variables: { id: product.id },
        fetchPolicy: 'network-only',
      });
      const pods = [...(data?.podsForProduct ?? [])].sort(byCost);
      const existing = lineOf(product.id);
      // A product already in the cart is stepped where it is, not started again in another pod.
      const pod = existing ? pods.find((option) => option.pod_id === existing.pod_id) : pods[0];
      if (!pod) {
        notify(t('mweb.shop.quickAddUnavailable'), 'info');
        return;
      }
      const current = existing?.quantity ?? 0;
      if (current >= pod.available_count) {
        notify(t('mweb.shop.quickAddMaxReached'), 'info');
        return;
      }
      setLine(
        {
          pod_id: pod.pod_id,
          pod_title: pod.pod_title,
          club_slug: pod.club_slug,
          product_id: product.id,
          variant_id: '',
          variant_label: '',
          product_name: pod.product_name,
          image_url: pod.image_url,
          unit_cost: pod.unit_cost,
          max_quantity: pod.available_count,
          free_delivery_above: pod.free_delivery_above ?? null,
        },
        current + 1,
      );
    } catch (error) {
      logs.mWeb.error('useQuickAddToCart', 'add', { error, productId: product.id });
      notify(t('mweb.shop.quickAddFailed'), 'error');
    } finally {
      setAddingId(null);
    }
  };

  /** One step from the card's control. Up checks the pod's stock again; down
   * (to zero: out of the cart) needs no lookup — the line is already there. */
  const setQuantity = async (product: ShopProduct, next: number) => {
    const existing = lineOf(product.id);
    if (next > (existing?.quantity ?? 0)) {
      await add(product);
      return;
    }
    if (existing) setLine(existing, next);
  };

  return { addingId, add, lineOf, setQuantity };
}
