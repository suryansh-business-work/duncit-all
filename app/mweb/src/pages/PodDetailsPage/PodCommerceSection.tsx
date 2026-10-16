import type { ComponentProps } from 'react';
import type { usePricing } from '../../hooks/usePricing';
import PodCommercePreview from '../pod-details-page/PodCommercePreview';
import type { usePodProductSelection } from '../pod-details-page/usePodProductSelection';
import PodShopRentCard from '../pod-rent/PodShopRentCard';
import { usePodRentalPicks } from '../pod-rent/usePodRentalPicks';
import { usePodRentals } from '../pod-rent/usePodRentals';

interface PodCommerceSectionProps {
  pod: ComponentProps<typeof PodCommercePreview>['pod'];
  priceFormat: ReturnType<typeof usePricing>['format'];
  productSelection: ReturnType<typeof usePodProductSelection>;
  /** The products feature flag: off hides the shop, never the rentals. */
  showProducts: boolean;
  /** Seats being booked: each guest may rent up to an item's per-guest limit. */
  seats: number;
}

/**
 * The pod's add-ons: its product shop, wired to the page's cart selection, and
 * what its venue rents out. A paid pod at a venue that rents things gets the
 * Pod Shop | Pod Rent card; otherwise the shop card stays exactly as it was.
 * Rentals ride on the seat's payment, so a free pod (no checkout) offers none.
 */
export default function PodCommerceSection({ pod, priceFormat, productSelection, showProducts, seats }: Readonly<PodCommerceSectionProps>) {
  const hasProducts = showProducts && (pod.product_requests ?? []).some((item: { product_name?: string | null } | null) => Boolean(item?.product_name));
  const rentable = pod.pod_mode !== 'VIRTUAL' && Boolean(pod.venue_id) && Number(pod.pod_amount ?? 0) > 0;
  const rentals = usePodRentals(pod.id, rentable);
  const picks = usePodRentalPicks(pod.id);
  const hasRentals = rentable && (rentals.catalogue?.items.length ?? 0) > 0;

  const renderShop = (limit?: number, embedded = false) => (
    <PodCommercePreview
      pod={pod}
      priceFormat={priceFormat}
      selectedProducts={productSelection.selectedProducts}
      onSelectionChange={productSelection.setSelectedProducts}
      selectedTotal={productSelection.selectedProductTotal}
      embedded={embedded}
      limit={limit}
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

  if (!hasRentals) return hasProducts ? renderShop() : null;
  return (
    <PodShopRentCard
      podTitle={pod.pod_title ?? ''}
      hasProducts={hasProducts}
      renderShop={(limit) => renderShop(limit, true)}
      rentals={rentals}
      picks={picks}
      seats={seats}
    />
  );
}
