import { useEffect, useState } from 'react';
import { logs } from '@duncit/logs';

import { PodsForProductDocument } from '@/graphql/details';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { useCartStore } from '@/stores/cart.store';
import type { ShopProduct } from '@/screens/ShopScreen';

/** What the buyer is told after a quick-add that did not add anything. */
export interface QuickAddNotice {
  tone: 'info' | 'danger';
  message: string;
}

/** How long a notice stays up — the same as mWeb's snackbar. */
const NOTICE_MS = 4000;

/** Quick-add a shop product to the cart from the browse grid without opening the
 * detail: resolve the cheapest live pod that stocks it (podsForProduct), then add
 * the base product (qty +1, never past the pod's stock) through that pod. Sets a
 * `notice` when no live pod stocks it, when the cart already holds all the
 * stock, or when the lookup fails (there is no app-wide toast on native, so the
 * screen renders it). `addingId` lets the pressed card show a spinner. Twin of
 * mWeb's useQuickAddToCart. */
export function useQuickAddToCart() {
  const { t } = useTranslation();
  const setLine = useCartStore((s) => s.setLine);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<QuickAddNotice | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const add = async (product: ShopProduct) => {
    setAddingId(product.id);
    setNotice(null);
    try {
      const data = await graphqlRequest(
        PodsForProductDocument,
        { productDocId: product.id },
        { auth: true },
      );
      const pod = [...data.podsForProduct].sort((a, b) => a.unit_cost - b.unit_cost)[0];
      if (!pod) {
        setNotice({ tone: 'info', message: t('mweb.shop.quickAddUnavailable') });
        return;
      }
      const existing = useCartStore
        .getState()
        .lines.find(
          (line) =>
            line.pod_id === pod.pod_id && line.product_id === product.id && line.variant_id === '',
        );
      const current = existing?.quantity ?? 0;
      if (current >= pod.available_count) {
        setNotice({ tone: 'info', message: t('mweb.shop.quickAddMaxReached') });
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
      logs.mobileApp.error('useQuickAddToCart', 'add', { error, productId: product.id });
      setNotice({ tone: 'danger', message: t('mweb.shop.quickAddFailed') });
    } finally {
      setAddingId(null);
    }
  };

  return { addingId, add, notice };
}
