export type ProductListingDeliveryTarget = 'HOST' | 'VENUE';

/** An extra purchasable variant (colour/size/etc.) with its own price/stock/images.
 * The product's own fields (below) are its default/primary variant. */
export interface ProductVariantValues {
  option_label: string;
  color: string;
  size_label: string;
  unit_cost: number | string;
  inventory_count: number | string;
  image_urls: string[];
}

export interface ProductListingValues {
  super_category_id: string;
  category_id: string;
  sub_category_id: string;
  product_name: string;
  image_urls: string[];
  description: string;
  size_label: string;
  height_cm: number | string;
  weight_kg: number | string;
  color: string;
  inventory_count: number | string;
  unit_cost: number | string;
  variants: ProductVariantValues[];
  commission_pct: number;
  delivery_target: ProductListingDeliveryTarget;
}