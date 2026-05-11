import { gql } from '@apollo/client';

export const INVENTORY_PRODUCTS = gql`
  query InventoryProducts($search: String, $status: InventoryStatus) {
    inventoryProducts(search: $search, status: $status) {
      id
      product_name
      sku
      brand_name
      image_url
      unit_cost
      selling_price
      inventory_count
      reserved_count
      requested_count
      available_count
      low_stock_alert
      status
      is_active
      updated_at
    }
  }
`;

export const CREATE_PRODUCT = gql`
  mutation CreateInventoryProduct($input: InventoryProductInput!) {
    createInventoryProduct(input: $input) {
      id
    }
  }
`;

export const UPDATE_PRODUCT = gql`
  mutation UpdateInventoryProduct($id: ID!, $input: UpdateInventoryProductInput!) {
    updateInventoryProduct(product_doc_id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_PRODUCT = gql`
  mutation DeleteInventoryProduct($id: ID!) {
    deleteInventoryProduct(product_doc_id: $id)
  }
`;
