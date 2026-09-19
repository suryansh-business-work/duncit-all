import { gql, type TypedDocumentNode } from '@apollo/client';
import type { ProductStatus } from '../lib/status';

/**
 * Products as shelf cards — what a collection, a home slider or a picker
 * shows — and the store-product search a picker adds from.
 */

export interface StoreProductCard {
  id: string;
  slug: string;
  title: string;
  brand_name: string;
  image_url: string;
  price: number;
  mrp: number;
  discount_pct: number;
  in_stock: boolean;
  featured: boolean;
}

/** A store product a picker can add. */
export interface PickerSearchRow {
  id: string;
  product_name: string;
  title: string;
  sku: string;
  brand_name: string;
  image_url: string;
  price: number;
  status: ProductStatus;
}

const CARD_FIELDS = `
  id
  slug
  title
  brand_name
  image_url
  price
  mrp
  discount_pct
  in_stock
  featured
`;

export const PICKER_PRODUCTS: TypedDocumentNode<{ storeAdminPickerProducts: StoreProductCard[] }, { ids: string[] }> = gql`
  query StoreAdminPickerProducts($ids: [ID!]!) {
    storeAdminPickerProducts(ids: $ids) {
      ${CARD_FIELDS}
    }
  }
`;

export const COLLECTION_PREVIEW: TypedDocumentNode<
  { storeAdminCollectionPreview: StoreProductCard[] },
  { slug: string }
> = gql`
  query StoreAdminCollectionPreview($slug: String!) {
    storeAdminCollectionPreview(slug: $slug) {
      ${CARD_FIELDS}
    }
  }
`;

export const PICKER_SEARCH: TypedDocumentNode<
  { storeAdminProductsTable: { rows: PickerSearchRow[]; total: number } },
  { query: { search: string; page: number; page_size: number } }
> = gql`
  query StorePickerSearch($query: TableQueryInput) {
    storeAdminProductsTable(query: $query) {
      total
      rows {
        id
        product_name
        title
        sku
        brand_name
        image_url
        price
        status
      }
    }
  }
`;
