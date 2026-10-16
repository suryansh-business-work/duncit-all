import { Reveal } from '@/animations/Reveal';
import { PodShop } from '@/components/details/PodShop';
import { PodShopRentCard } from '@/components/details/rent/PodShopRentCard';
import type { PodDetail } from '@/hooks/useDetails';
import { usePodRentals } from '@/hooks/usePodRentals';
import { usePodRentalPicks } from '@/stores/rental-picks.store';
import type { CartLineMeta } from '@/stores/cart.store';

interface PodShopSectionProps {
  pod: PodDetail;
  /** The `is_product_visible` feature flag: off hides the shop, never the rentals. */
  showProducts: boolean;
  selectedProducts: Record<string, number>;
  onSelectionChange: (next: Record<string, number>) => void;
  selectedTotal: number;
  onVariantQuantity: (meta: CartLineMeta, quantity: number) => void;
  /** Seats being booked: each guest may rent up to an item's per-guest limit. */
  seats: number;
}

/**
 * The pod's add-ons: the Pod Shop (when products are gated on and the pod
 * lists some) and what its venue rents out. A paid pod at a venue that rents
 * things gets the Pod Shop | Pod Rent card; otherwise the shop card stays as
 * it was. Rentals ride on the seat's payment; on a free pod they are the whole payment.
 */
export function PodShopSection({
  pod,
  showProducts,
  selectedProducts,
  onSelectionChange,
  selectedTotal,
  onVariantQuantity,
  seats,
}: Readonly<PodShopSectionProps>) {
  // The generated PodMode is a TS enum; compared as the string the server sends.
  const rentable = String(pod.pod_mode) !== 'VIRTUAL' && Boolean(pod.venue_id);
  const rentals = usePodRentals(pod.id, rentable);
  const picks = usePodRentalPicks(pod.id);
  const hasProducts = showProducts && Boolean(pod.product_requests?.length);
  const hasRentals = rentable && (rentals.catalogue?.items.length ?? 0) > 0;

  const shop = (embedded: boolean) => (
    <PodShop
      pod={pod}
      embedded={embedded}
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
  );

  if (!hasRentals) return hasProducts ? <Reveal index={3}>{shop(false)}</Reveal> : null;
  return (
    <Reveal index={3}>
      <PodShopRentCard
        podTitle={pod.pod_title ?? ''}
        hasProducts={hasProducts}
        shop={hasProducts ? shop(true) : null}
        rentals={rentals}
        picks={picks}
        seats={seats}
      />
    </Reveal>
  );
}
