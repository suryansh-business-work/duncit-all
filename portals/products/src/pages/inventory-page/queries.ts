import { gql } from '@apollo/client';
import type { InventoryStatus } from './inventory-product-page/types';

/** Row shape consumed by the inventory table columns. */
export interface InventoryProductRow {
  id: string;
  product_name: string;
  sku: string;
  brand_name?: string | null;
  image_url?: string | null;
  unit_cost: number;
  selling_price?: number | null;
  inventory_count: number;
  available_count: number;
  low_stock_alert?: number | null;
  status: InventoryStatus;
  created_at?: string | null;
}

/** Same selection the table columns touch (+ created_at for the Created filter column). */
const INVENTORY_PRODUCT_ROW_FIELDS = gql`
  fragment InventoryProductRowFields on InventoryProduct {
    id
    product_name
    sku
    brand_name
    image_url
    unit_cost
    selling_price
    inventory_count
    available_count
    low_stock_alert
    status
    created_at
  }
`;

export const INVENTORY_PRODUCTS_TABLE = gql`
  query InventoryProductsTable($query: TableQueryInput) {
    inventoryProductsTable(query: $query) {
      total
      rows {
        ...InventoryProductRowFields
      }
    }
  }
  ${INVENTORY_PRODUCT_ROW_FIELDS}
`;

export const INVENTORY_PRODUCTS = gql`
  query InventoryProducts($search: String, $status: InventoryStatus, $ownership: ProductOwnership) {
    inventoryProducts(search: $search, status: $status, ownership: $ownership) {
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
