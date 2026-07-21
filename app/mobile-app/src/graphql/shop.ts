import { gql } from '@/generated/graphql';

/** Every approved, pod-available product platform-wide — the Pod Shop browse
 * catalogue (sidebar). Category filter/search/sort run client-side. RN twin of
 * mWeb's SHOP_PRODUCTS. */
export const ShopProductsDocument = gql(`
  query MobileShopProducts {
    availablePodProducts {
      id
      product_name
      brand_name
      image_url
      images
      unit_cost
      category_id
      super_category_id
      sub_category_id
      created_at
    }
  }
`);
