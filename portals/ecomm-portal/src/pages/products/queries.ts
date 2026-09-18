import { gql, type TypedDocumentNode } from '@apollo/client';

/** One catalogue product as the listings table shows it. */
export interface StoreListingRow {
  id: string;
  product_name: string;
  sku: string;
  brand_name: string;
  image_url: string;
  price: number;
  mrp: number;
  available: number;
  variant_count: number;
  status: string;
  is_active: boolean;
  review_status: string;
  /** False when no Duncit warehouse is set — the parcel ships from the default pickup. */
  has_warehouse: boolean;
  listed: boolean;
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
  listed_at: string | null;
  updated_at: string;
}

export interface StoreListingVariant {
  id: string;
  label: string;
  sku: string;
  price: number;
  mrp: number;
  available: number;
}

/** The full editable listing, with the product facts shown beside it. */
export interface StoreListing extends StoreListingRow {
  short_description: string;
  description: string;
  images: string[];
  variants: StoreListingVariant[];
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

const ROW_FIELDS = `
  id
  product_name
  sku
  brand_name
  image_url
  price
  mrp
  available
  variant_count
  status
  is_active
  review_status
  has_warehouse
  listed
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
  listed_at
  updated_at
`;

const LISTING_FIELDS = `
  ${ROW_FIELDS}
  short_description
  description
  images
  variants {
    id
    label
    sku
    price
    mrp
    available
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

export const STORE_LISTINGS_TABLE = gql`
  query StoreListingsTable($query: TableQueryInput) {
    storeListingsTable(query: $query) {
      total
      rows {
        ${ROW_FIELDS}
      }
    }
  }
`;

export const STORE_LISTING: TypedDocumentNode<{ storeListing: StoreListing }, { product_id: string }> = gql`
  query StoreListing($product_id: ID!) {
    storeListing(product_id: $product_id) {
      ${LISTING_FIELDS}
    }
  }
`;

export const SAVE_LISTING = gql`
  mutation StoreSaveListing($product_id: ID!, $input: StoreListingInput!) {
    storeSaveListing(product_id: $product_id, input: $input) {
      ${LISTING_FIELDS}
    }
  }
`;

export const SET_LISTED: TypedDocumentNode<{ storeSetListed: number }, { product_ids: string[]; listed: boolean }> = gql`
  mutation StoreSetListed($product_ids: [ID!]!, $listed: Boolean!) {
    storeSetListed(product_ids: $product_ids, listed: $listed)
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
