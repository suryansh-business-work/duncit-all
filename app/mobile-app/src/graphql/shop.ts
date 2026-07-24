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

/** The global Pod Shop top slider (image/video) — admin-managed from the
 * products portal, shown above the Pod Shop grid. RN twin of mWeb's shop-page
 * slider read. */
export const PodShopSliderDocument = gql(`
  query MobilePodShopSlider {
    branding {
      pod_shop_slider {
        url
        type
        order
      }
    }
  }
`);
