import { gql } from '@apollo/client';

export const INVENTORY_PRODUCTS = gql`
  query InventoryProducts($search: String) {
    inventoryProducts(search: $search) {
      id
      product_name
      sku
      description
      image_url
      unit_cost
      inventory_count
      requested_count
      available_count
      is_active
      updated_at
    }
  }
`;

export const CREATE_PRODUCT = gql`
  mutation CreateInventoryProduct($input: InventoryProductInput!) {
    createInventoryProduct(input: $input) { id }
  }
`;

export const UPDATE_PRODUCT = gql`
  mutation UpdateInventoryProduct($id: ID!, $input: UpdateInventoryProductInput!) {
    updateInventoryProduct(product_doc_id: $id, input: $input) { id }
  }
`;

export const DELETE_PRODUCT = gql`
  mutation DeleteInventoryProduct($id: ID!) {
    deleteInventoryProduct(product_doc_id: $id)
  }
`;

export interface InventoryProductForm {
  id?: string;
  product_name: string;
  sku: string;
  description: string;
  image_url: string;
  unit_cost: number;
  inventory_count: number;
  is_active: boolean;
}

export const blankInventoryForm: InventoryProductForm = {
  product_name: '',
  sku: '',
  description: '',
  image_url: '',
  unit_cost: 0,
  inventory_count: 0,
  is_active: true,
};