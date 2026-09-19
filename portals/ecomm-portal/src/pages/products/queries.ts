import { gql, type TypedDocumentNode } from '@apollo/client';
import type { ProductStatus } from '../../lib/status';

/** One of the store's own products as the products table shows it. */
export interface StoreProductRow {
  id: string;
  product_name: string;
  sku: string;
  brand_id: string | null;
  brand_name: string;
  image_url: string;
  price: number;
  mrp: number;
  available: number;
  variant_count: number;
  status: ProductStatus;
  /** False until a Duncit warehouse is picked — a product cannot be published without one. */
  has_warehouse: boolean;
  slug: string;
  title: string;
  badge: string;
  featured: boolean;
  sort_rank: number;
  pet_type_ids: string[];
  category_ids: string[];
  sold_count: number;
  view_count: number;
  wishlist_count: number;
  published_at: string | null;
  updated_at: string;
}

export interface StoreProductVariant {
  id: string;
  option_label: string;
  sku: string;
  price: number;
  mrp: number;
  stock: number;
  images: string[];
  weight_kg: number;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
}

/** Everything the product editor shows and saves back. */
export interface StoreProduct extends StoreProductRow {
  short_description: string;
  description: string;
  images: string[];
  stock: number;
  low_stock_alert: number;
  weight_kg: number;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
  warehouse_id: string | null;
  /** What the variants differ by, e.g. Size. */
  variant_option: string;
  variants: StoreProductVariant[];
  facet_values: { facet_id: string; values: string[] }[];
  highlights: string[];
  specifications: { label: string; value: string }[];
  ingredients: string;
  feeding_guide: string;
  care_instructions: string;
  seo_title: string;
  seo_description: string;
  search_keywords: string[];
  video_url: string;
  cod_available: boolean;
  returnable: boolean;
  /** Null uses the store's default window. */
  return_window_days: number | null;
  max_per_order: number;
}

/** One of Duncit's own warehouses — where a store product ships from. */
export interface StoreWarehouse {
  id: string;
  nickname: string;
  city: string;
  pincode: string;
  is_default: boolean;
  /** Registered with ShipRocket, so parcels can be picked up from it. */
  shiprocket_ready: boolean;
}

const ROW_FIELDS = `
  id
  product_name
  sku
  brand_id
  brand_name
  image_url
  price
  mrp
  available
  variant_count
  status
  has_warehouse
  slug
  title
  badge
  featured
  sort_rank
  pet_type_ids
  category_ids
  sold_count
  view_count
  wishlist_count
  published_at
  updated_at
`;

const PRODUCT_FIELDS = `
  ${ROW_FIELDS}
  short_description
  description
  images
  stock
  low_stock_alert
  weight_kg
  length_cm
  breadth_cm
  height_cm
  warehouse_id
  variant_option
  variants {
    id
    option_label
    sku
    price
    mrp
    stock
    images
    weight_kg
    length_cm
    breadth_cm
    height_cm
  }
  facet_values {
    facet_id
    values
  }
  highlights
  specifications {
    label
    value
  }
  ingredients
  feeding_guide
  care_instructions
  seo_title
  seo_description
  search_keywords
  video_url
  cod_available
  returnable
  return_window_days
  max_per_order
`;

export const STORE_PRODUCTS_TABLE = gql`
  query StoreAdminProductsTable($query: TableQueryInput) {
    storeAdminProductsTable(query: $query) {
      total
      rows {
        ${ROW_FIELDS}
      }
    }
  }
`;

export const STORE_PRODUCT: TypedDocumentNode<{ storeAdminProduct: StoreProduct }, { id: string }> = gql`
  query StoreAdminProduct($id: ID!) {
    storeAdminProduct(id: $id) {
      ${PRODUCT_FIELDS}
    }
  }
`;

export const SAVE_PRODUCT: TypedDocumentNode<
  { storeSaveProduct: StoreProduct },
  { id: string | null; input: Record<string, unknown>; status: ProductStatus }
> = gql`
  mutation StoreSaveProduct($id: ID, $input: StoreAdminProductInput!, $status: StoreProductStatus!) {
    storeSaveProduct(id: $id, input: $input, status: $status) {
      ${PRODUCT_FIELDS}
    }
  }
`;

export const SET_PRODUCT_STATUS: TypedDocumentNode<
  { storeSetProductStatus: number },
  { ids: string[]; status: ProductStatus }
> = gql`
  mutation StoreSetProductStatus($ids: [ID!]!, $status: StoreProductStatus!) {
    storeSetProductStatus(ids: $ids, status: $status)
  }
`;

export const BULK_FILE: TypedDocumentNode<
  { storeBulkFile: number },
  { product_ids: string[]; pet_type_ids: string[]; category_ids: string[] }
> = gql`
  mutation StoreBulkFile($product_ids: [ID!]!, $pet_type_ids: [ID!], $category_ids: [ID!]) {
    storeBulkFile(product_ids: $product_ids, pet_type_ids: $pet_type_ids, category_ids: $category_ids)
  }
`;

export const STORE_WAREHOUSES: TypedDocumentNode<{ storeAdminWarehouses: StoreWarehouse[] }> = gql`
  query StoreAdminWarehouses {
    storeAdminWarehouses {
      id
      nickname
      city
      pincode
      is_default
      shiprocket_ready
    }
  }
`;
