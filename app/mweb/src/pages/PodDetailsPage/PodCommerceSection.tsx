import type { ComponentProps } from 'react';
import type { usePricing } from '../../hooks/usePricing';
import PodCommercePreview from '../pod-details-page/PodCommercePreview';
import type { usePodProductSelection } from '../pod-details-page/usePodProductSelection';

interface PodCommerceSectionProps {
  pod: ComponentProps<typeof PodCommercePreview>['pod'];
  priceFormat: ReturnType<typeof usePricing>['format'];
  productSelection: ReturnType<typeof usePodProductSelection>;
}

/** The pod's product add-ons, wired to the page's cart selection. */
export default function PodCommerceSection({ pod, priceFormat, productSelection }: Readonly<PodCommerceSectionProps>) {
  return (
    <PodCommercePreview
      pod={pod}
      priceFormat={priceFormat}
      selectedProducts={productSelection.selectedProducts}
      onSelectionChange={productSelection.setSelectedProducts}
      selectedTotal={productSelection.selectedProductTotal}
      onVariantQuantity={(row, variant, quantity) =>
        productSelection.setVariantQuantity(
          {
            pod_id: pod.id,
            pod_title: pod.pod_title ?? '',
            club_slug: pod.club_slug ?? '',
            product_id: row.product_id,
            variant_id: variant.id,
            variant_label: variant.label,
            product_name: row.product_name ?? 'Product',
            image_url: variant.image_url || row.image_url || '',
            unit_cost: variant.unit_cost,
            max_quantity: variant.max,
            free_delivery_above: row.free_delivery_above ?? null,
          },
          quantity,
        )
      }
    />
  );
}
