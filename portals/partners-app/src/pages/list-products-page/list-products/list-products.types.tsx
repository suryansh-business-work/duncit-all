import type { AdminCategoryValue } from '@duncit/category';
import type { PackageType } from '@duncit/utils';

/** ShipRocket is the only delivery option offered to brands now (Host/Venue
 * self-delivery was removed). The server enum still accepts the legacy values. */
export type ProductListingDeliveryTarget = 'SHIPROCKET';

/** One resolved option value on a variant, e.g. { name: 'Size', value: 'M' }. */
export interface VariantOptionValue {
  name: string;
  value: string;
}

/** A product-level option definition, e.g. { name: 'Size', values: ['S','M','L'] }.
 * Variants are the cartesian product of every option's values. */
export interface ProductOptionValues {
  name: string;
  values: string[];
}

/** A purchasable variant (an option combination) with its own media, copy,
 * price and stock. Its packed parcel is optional: a blank dimension ships in
 * the product's own parcel. */
export interface ProductVariantValues {
  option_label: string;
  option_values: VariantOptionValue[];
  /** The partner's own stock code, sent to ShipRocket ('' = the server generates one). */
  sku: string;
  color: string;
  size_label: string;
  description: string;
  image_urls: string[];
  height_cm: number | string;
  weight_kg: number | string;
  length_cm: number | string;
  breadth_cm: number | string;
  unit_cost: number | string;
  /** Printed MRP the store strikes the price through from ('' = none). */
  mrp: number | string;
  inventory_count: number | string;
}

export interface ProductListingValues {
  /** One or more Super → Category → Sub rows the product is sold in. */
  categories: AdminCategoryValue[];
  product_name: string;
  /** The PACKED parcel of one unit, box included — what ShipRocket rates and
   * bills, and every variant's fallback. */
  height_cm: number | string;
  weight_kg: number | string;
  length_cm: number | string;
  breadth_cm: number | string;
  package_type: PackageType;
  /** GST HSN code, 4-8 digits. */
  hsn_code: string;
  is_fragile: boolean;
  is_liquid: boolean;
  /** Days a sealed unit stays good ('' = doesn't expire). */
  shelf_life_days: number | string;
  /** GST rate on the product (0, 5, 12, 18 or 28) — printed on the invoice and sent to ShipRocket. */
  tax_percent: number;
  /** Product-level option definitions; variants are their combinations. */
  options: ProductOptionValues[];
  variants: ProductVariantValues[];
  commission_pct: number;
  delivery_target: ProductListingDeliveryTarget;
  /** Brand warehouse (BrandPickupLocation) this product ships from. */
  pickup_location_id: string;
  /** Line subtotal at/above which this product's delivery is free ('' = no offer). */
  free_delivery_above: number | string;
}
