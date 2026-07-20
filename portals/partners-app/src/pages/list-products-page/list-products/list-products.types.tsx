import type { AdminCategoryValue } from '@duncit/category';

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
 * dimensions, price and stock. */
export interface ProductVariantValues {
  option_label: string;
  option_values: VariantOptionValue[];
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
  /** Product-level option definitions; variants are their combinations. */
  options: ProductOptionValues[];
  variants: ProductVariantValues[];
  commission_pct: number;
  delivery_target: ProductListingDeliveryTarget;
}
