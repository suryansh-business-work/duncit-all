import { gql } from '@apollo/client';

const PRODUCT_FIELDS = `
  id
  product_name
  description
  image_url
  images
  size_label
  height_cm
  weight_kg
  color
  inventory_count
  available_count
  unit_cost
  commission_pct
  delivery_target
  listing_review_status
  listing_review_notes
  is_duncit_delivery_partner
  updated_at
`;

/** Legacy full-list doc — still used by ProductListingEditorPage's fallback fetch. */
export const MY_PRODUCT_LISTINGS = gql`
  query MyProductListings($brand_id: ID) { myProductListings(brand_id: $brand_id) { ${PRODUCT_FIELDS} } }
`;

export const MY_PRODUCT_LISTINGS_TABLE = gql`
  query MyProductListingsTable($brand_id: ID, $query: TableQueryInput) {
    myProductListingsTable(brand_id: $brand_id, query: $query) {
      total
      rows { ${PRODUCT_FIELDS} }
    }
  }
`;

export const UPDATE_QUANTITY = gql`
  mutation UpdateMyProductListingQuantity($product_doc_id: ID!, $inventory_count: Int!) {
    updateMyProductListingQuantity(product_doc_id: $product_doc_id, inventory_count: $inventory_count) { ${PRODUCT_FIELDS} }
  }
`;

export const DELETE_LISTING = gql`
  mutation DeleteMyProductListing($product_doc_id: ID!) {
    deleteMyProductListing(product_doc_id: $product_doc_id)
  }
`;

/** Row shape for the "Your listed products" table (myProductListingsTable rows). */
export interface ProductListingRow {
  id: string;
  product_name: string;
  description?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  size_label?: string | null;
  color?: string | null;
  inventory_count?: number | null;
  available_count?: number | null;
  unit_cost?: number | null;
  delivery_target?: string | null;
  listing_review_status: string;
  updated_at?: string | null;
}
