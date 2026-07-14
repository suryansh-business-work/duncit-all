import { gql } from '@apollo/client';

/** Row shape consumed by the product listing requests table + review dialog. */
export interface ProductListingRow {
  id: string;
  product_name: string;
  image_url?: string | null;
  description?: string | null;
  inventory_count: number;
  unit_cost: number;
  commission_pct: number;
  delivery_target: 'HOST' | 'VENUE';
  listing_review_status: 'PENDING' | 'APPROVED' | 'DENIED';
  listing_review_notes?: string | null;
  listing_submitted_by_name?: string | null;
  is_duncit_delivery_partner: boolean;
  size_label?: string | null;
  height_cm: number;
  weight_kg: number;
  color?: string | null;
  created_at?: string | null;
}

export const REQUEST_STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  DENIED: 'error',
};

const PRODUCT_LISTING_ROW_FIELDS = gql`
  fragment ProductListingRowFields on InventoryProduct {
    id
    product_name
    image_url
    description
    inventory_count
    unit_cost
    commission_pct
    delivery_target
    listing_review_status
    listing_review_notes
    listing_submitted_by_name
    is_duncit_delivery_partner
    size_label
    height_cm
    weight_kg
    color
    created_at
  }
`;

export const PRODUCT_LISTING_REQUESTS_TABLE = gql`
  query ProductListingRequestsTable($query: TableQueryInput) {
    productListingRequestsTable(query: $query) {
      total
      rows {
        ...ProductListingRowFields
      }
    }
  }
  ${PRODUCT_LISTING_ROW_FIELDS}
`;

export const REVIEW_PRODUCT_LISTING = gql`
  mutation ReviewProductListing(
    $product_doc_id: ID!
    $status: ProductListingReviewStatus!
    $notes: String
    $commission_pct: Float
  ) {
    reviewProductListing(
      product_doc_id: $product_doc_id
      status: $status
      notes: $notes
      commission_pct: $commission_pct
    ) {
      id
      listing_review_status
      listing_review_notes
      commission_pct
      status
      is_active
    }
  }
`;
