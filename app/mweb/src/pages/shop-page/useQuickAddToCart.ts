import { useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { useCart } from '../../components/cart/CartContext';
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

/** Quick-add a shop product to the cart from the browse grid without opening the
 * detail: resolve the cheapest live pod that stocks it (podsForProduct), then add
 * the base product (qty +1) through that pod. No-ops silently when no live pod
 * stocks the product. `addingId` lets the pressed card show a spinner. Twin of
 * the mobile app's useQuickAddToCart. */
export function useQuickAddToCart() {
  const client = useApolloClient();
  const { lines, setLine } = useCart();
  const [addingId, setAddingId] = useState<string | null>(null);

  const add = async (product: ShopProduct) => {
    setAddingId(product.id);
    try {
      const { data } = await client.query<{ podsForProduct: PodOption[] }>({
        query: PODS_FOR_PRODUCT,
        variables: { id: product.id },
        fetchPolicy: 'network-only',
      });
      const pod = [...(data?.podsForProduct ?? [])].sort((a, b) => a.unit_cost - b.unit_cost)[0];
      if (!pod) return;
      const existing = lines.find(
        (line) =>
          line.pod_id === pod.pod_id && line.product_id === product.id && line.variant_id === '',
      );
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
        (existing?.quantity ?? 0) + 1,
      );
    } finally {
      setAddingId(null);
    }
  };

  return { addingId, add };
}
