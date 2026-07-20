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
  length_cm
  breadth_cm
  color
  inventory_count
  available_count
  low_stock_alert
  notify_low_stock
  unit_cost
  commission_pct
  delivery_target
  super_category_id
  category_id
  sub_category_id
  categories {
    super_category_id
    category_id
    sub_category_id
    super_category_name
    category_name
    sub_category_name
  }
  options {
    name
    values
  }
  variants {
    option_label
    option_values {
      name
      value
    }
    color
    size_label
    description
    unit_cost
    inventory_count
    images
    height_cm
    breadth_cm
    length_cm
    weight_kg
  }
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

export const MY_PRODUCT_ANALYTICS = gql`
  query MyProductAnalytics($product_doc_id: ID!) {
    myProductAnalytics(product_doc_id: $product_doc_id) {
      total_views
      total_clicks
      orders
      units_sold
      gross_revenue
      total_earning
      currency_symbol
      linked_pods
      locations {
        location
        units_sold
        orders
      }
      variants {
        variant_id
        variant_label
        units_sold
        orders
        views
        clicks
      }
    }
  }
`;

export const UPDATE_PRODUCT_SETTINGS = gql`
  mutation UpdateMyProductSettings($product_doc_id: ID!, $low_stock_alert: Int!, $notify_low_stock: Boolean!) {
    updateMyProductSettings(product_doc_id: $product_doc_id, low_stock_alert: $low_stock_alert, notify_low_stock: $notify_low_stock) {
      ${PRODUCT_FIELDS}
    }
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
  low_stock_alert?: number | null;
  notify_low_stock?: boolean | null;
  unit_cost?: number | null;
  delivery_target?: string | null;
  listing_review_status: string;
  updated_at?: string | null;
}
