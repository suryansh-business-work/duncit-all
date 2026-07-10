export type ProductListingDeliveryTarget = 'HOST' | 'VENUE';

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
  commission_pct: number;
  delivery_target: ProductListingDeliveryTarget;
}