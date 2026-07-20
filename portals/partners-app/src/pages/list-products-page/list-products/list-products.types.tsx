import type { AdminCategoryValue } from '@duncit/category';

/** ShipRocket is the only delivery option offered to brands now (Host/Venue
 * self-delivery was removed). The server enum still accepts the legacy values. */
export type ProductListingDeliveryTarget = 'SHIPROCKET';

/** A purchasable variant with its own media, copy, dimensions, price and stock.
 * In the per-variant model every variant (including the first) carries full
 * detail — nothing is entered at the product level before the variants. */
export interface ProductVariantValues {
  option_label: string;
  color: string;
  size_label: string;
  description: string;
  image_urls: string[];
  height_cm: number | string;
  weight_kg: number | string;
  length_cm: number | string;
  breadth_cm: number | string;
  unit_cost: number | string;
  inventory_count: number | string;
}

export interface ProductListingValues {
  /** One or more Super → Category → Sub rows the product is sold in. */
  categories: AdminCategoryValue[];
  product_name: string;
  variants: ProductVariantValues[];
  commission_pct: number;
  delivery_target: ProductListingDeliveryTarget;
}
