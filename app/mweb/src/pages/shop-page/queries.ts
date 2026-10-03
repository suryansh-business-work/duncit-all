import { gql } from '@apollo/client';

/** Every approved, pod-available product platform-wide — the Pod Shop browse
 * catalogue. Category filter/search/sort run client-side over this list. */
export const SHOP_PRODUCTS = gql`
  query ShopProducts {
    availablePodProducts {
      id
      product_name
      brand_name
      image_url
      images
      unit_cost
      pod_available_count
      category_id
      super_category_id
      sub_category_id
      created_at
      review_summary {
        average_rating
        total
      }
    }
  }
`;

export interface ReviewSummary {
  average_rating: number;
  total: number;
}

export interface ShopProduct {
  id: string;
  product_name: string;
  brand_name?: string | null;
  image_url?: string | null;
  images: string[];
  unit_cost: number;
  pod_available_count: number;
  category_id?: string | null;
  super_category_id?: string | null;
  sub_category_id?: string | null;
  created_at?: string | null;
  review_summary?: ReviewSummary | null;
}

export type ShopSort = 'NAME' | 'PRICE_ASC' | 'PRICE_DESC';

/** Sort choices; `labelKey` is a literal i18n key the filter bar translates. */
export const SHOP_SORT_OPTIONS: ReadonlyArray<{ value: ShopSort; labelKey: string }> = [
  { value: 'NAME', labelKey: 'mweb.shop.sortName' },
  { value: 'PRICE_ASC', labelKey: 'mweb.shop.sortPriceAsc' },
  { value: 'PRICE_DESC', labelKey: 'mweb.shop.sortPriceDesc' },
];

/** Pure sort helper shared by the page + tests. */
export function sortShopProducts(products: ShopProduct[], sort: ShopSort): ShopProduct[] {
  const copy = [...products];
  if (sort === 'PRICE_ASC') return copy.sort((a, b) => a.unit_cost - b.unit_cost);
  if (sort === 'PRICE_DESC') return copy.sort((a, b) => b.unit_cost - a.unit_cost);
  return copy.sort((a, b) => a.product_name.localeCompare(b.product_name));
}
