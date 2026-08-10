import { gql } from '@apollo/client';

/**
 * Everything the picker renders about a product, in one fragment.
 *
 * mWeb, the admin portal and both partners-app pod pages all query
 * `availablePodProducts` (admin queries `inventoryProducts`, the same
 * `InventoryProduct` type) to feed this dialog. Four hand-kept selection sets is
 * how one of them ends up without `image_url` and silently renders placeholder
 * cards, so the selection lives here (rule 40).
 *
 * The native app keeps its own copy: it runs GraphQL Code Generator over typed
 * documents and cannot import an @apollo/client fragment.
 */
export const POD_PICKER_PRODUCT_FIELDS = gql`
  fragment PodPickerProductFields on InventoryProduct {
    id
    product_name
    unit_cost
    available_count
    brand_name
    sku
    short_description
    description
    image_url
    images
    unit_type
    weight_volume
    tags
    super_category_id
    category_id
    sub_category_id
    categories {
      super_category_id
      category_id
      sub_category_id
    }
  }
`;
