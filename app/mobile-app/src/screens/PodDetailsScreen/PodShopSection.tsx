import { Reveal } from '@/animations/Reveal';
import { PodShop } from '@/components/details/PodShop';
import type { PodDetail } from '@/hooks/useDetails';
import type { CartLineMeta } from '@/stores/cart.store';

interface PodShopSectionProps {
  pod: PodDetail;
  /** The `is_product_visible` feature flag. */
  showProducts: boolean;
  selectedProducts: Record<string, number>;
  onSelectionChange: (next: Record<string, number>) => void;
  selectedTotal: number;
  onVariantQuantity: (meta: CartLineMeta, quantity: number) => void;
}

/** The Pod Shop — only when products are gated on and the pod lists some. A
 * variant picked in the detail sheet becomes a cart line for this pod. */
export function PodShopSection({
  pod,
  showProducts,
  selectedProducts,
  onSelectionChange,
  selectedTotal,
  onVariantQuantity,
}: Readonly<PodShopSectionProps>) {
  if (!showProducts || !pod.product_requests?.length) return null;
  return (
    <Reveal index={3}>
      <PodShop
        pod={pod}
        selectedProducts={selectedProducts}
        onSelectionChange={onSelectionChange}
        selectedTotal={selectedTotal}
        onVariantQuantity={(row, variant, quantity) =>
          onVariantQuantity(
            {
              pod_id: pod.id,
              pod_title: pod.pod_title,
              club_slug: pod.club_slug,
              product_id: row.product_id,
              variant_id: variant.id,
              variant_label: variant.label,
              product_name: row.product_name,
              image_url: variant.image_url || row.image_url,
              unit_cost: variant.unit_cost,
              max_quantity: variant.max,
              free_delivery_above: row.free_delivery_above ?? null,
            },
            quantity,
          )
        }
        readOnly={pod.products_enabled === false}
      />
    </Reveal>
  );
}
