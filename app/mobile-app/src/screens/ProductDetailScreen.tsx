import { useEffect, useMemo, useState } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { YStack } from 'tamagui';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { AppBackground } from '@/components/AppBackground';
import { ProductDetailSheet, type VariantPick } from '@/components/details/ProductDetailSheet';
import { PodsForProductDocument } from '@/graphql/details';
import { useGoBack } from '@/hooks/useGoBack';
import { graphqlRequest } from '@/services/graphql.client';
import { cartLineKey, useCartStore } from '@/stores/cart.store';
import type { RootStackParamList } from '@/navigation/types';

type PodOption = ResultOf<typeof PodsForProductDocument>['podsForProduct'][number];

/** Standalone product detail (Pod Shop browse → tap a product). Products and
 * pods are separate entities, so the catalogue product carries no pod — we
 * resolve the cheapest live pod that stocks it (podsForProduct) and wire the
 * detail sheet's add/remove to the shared cart, keeping counts synced app-wide.
 * Stays browse-only when no live pod stocks the product. RN twin of mWeb's
 * ProductDetailPage. */
export function ProductDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ProductDetail'>>();
  const productId = route.params.productId;
  const goBack = useGoBack();
  const lines = useCartStore((s) => s.lines);
  const setLine = useCartStore((s) => s.setLine);
  const [pod, setPod] = useState<PodOption | null>(null);

  useEffect(() => {
    let active = true;
    graphqlRequest(PodsForProductDocument, { productDocId: productId }, { auth: true })
      .then((data) => {
        if (!active) return;
        // Auto-pick the cheapest stocking pod — the pod is resolved silently so
        // the product stays the hero (pod stays invisible, per req 3).
        const options = [...data.podsForProduct];
        options.sort((a, b) => a.unit_cost - b.unit_cost);
        setPod(options[0] ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [productId]);

  const selection = useMemo(() => {
    if (!pod) return undefined;
    const map: Record<string, number> = {};
    for (const line of lines) {
      if (line.pod_id === pod.pod_id && line.product_id === productId) {
        map[cartLineKey(line)] = line.quantity;
      }
    }
    return map;
  }, [lines, pod, productId]);

  const onUpdateLine =
    pod == null
      ? undefined
      : (quantity: number, variant: VariantPick | null) =>
          setLine(
            {
              pod_id: pod.pod_id,
              pod_title: pod.pod_title,
              club_slug: pod.club_slug,
              product_id: productId,
              variant_id: variant?.id ?? '',
              variant_label: variant?.label ?? '',
              product_name: pod.product_name,
              image_url: variant?.image_url || pod.image_url,
              unit_cost: variant?.unit_cost ?? pod.unit_cost,
              max_quantity: variant?.max ?? pod.available_count,
              free_delivery_above: pod.free_delivery_above ?? null,
            },
            quantity,
          );

  return (
    <YStack flex={1} testID="product-detail-screen">
      <AppBackground />
      <ProductDetailSheet
        productId={productId}
        onClose={goBack}
        selection={selection}
        maxQuantity={pod?.available_count ?? 0}
        onUpdateLine={onUpdateLine}
        readOnly={pod == null}
      />
    </YStack>
  );
}
