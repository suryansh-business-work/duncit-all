import { gql } from '@apollo/client';

export const MARKETPLACE_BRANDS = gql`
  query MarketplaceBrands($status: EcommBrandStatus) {
    marketplaceBrands(status: $status) {
      id
      brand_name
      logo_url
      status
      approved_product_count
      default_pickup_location_id
      city
      state
      contact_email
      contact_phone
    }
  }
`;

export const MARKETPLACE_BRAND_PRODUCTS = gql`
  query MarketplaceBrandProducts($brand_doc_id: ID!) {
    marketplaceBrandProducts(brand_doc_id: $brand_doc_id) {
      id
      product_name
      sku
      image_url
      unit_cost
      selling_price
      inventory_count
      available_count
      status
      commission_pct
      height_cm
      length_cm
      breadth_cm
      weight_kg
    }
  }
`;

export interface EcommBrandDocument {
  type: string;
  url: string;
}

/** Row shape consumed by the brands review table AND the review dialog — rows
 * carry the whole submission so approving needs no second round trip. */
export interface EcommBrandRow {
  id: string;
  brand_no?: string | null;
  brand_name: string;
  logo_url?: string | null;
  cover_image_url?: string | null;
  tagline?: string | null;
  description?: string | null;
  product_categories?: string[] | null;
  status: string;
  is_active?: boolean | null;
  reviewer_notes?: string | null;
  tags?: string[] | null;
  approved_product_count: number;
  default_pickup_location_id?: string | null;
  contact_person?: string | null;
  city?: string | null;
  state?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  registered_business_name?: string | null;
  gstin?: string | null;
  pan?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  documents?: EcommBrandDocument[] | null;
  submitted_at?: string | null;
  created_at?: string | null;
}

/** Everything the review inbox shows plus everything the review dialog reads. */
const ECOMM_BRAND_ROW_FIELDS = gql`
  fragment EcommBrandRowFields on EcommBrand {
    id
    brand_no
    brand_name
    logo_url
    cover_image_url
    tagline
    description
    product_categories
    status
    is_active
    reviewer_notes
    tags
    approved_product_count
    default_pickup_location_id
    contact_person
    city
    state
    contact_email
    contact_phone
    registered_business_name
    gstin
    pan
    website_url
    instagram_url
    documents {
      type
      url
    }
    submitted_at
    created_at
  }
`;

/**
 * The review inbox source. `ecommBrandsTable` is unscoped — every brand, every
 * status, deactivated included — which is what an approval queue needs.
 * `marketplaceBrandsTable` is APPROVED+active only (correct for the storefront)
 * and hid partner submissions from this page entirely.
 */
export const ECOMM_BRANDS_TABLE = gql`
  query EcommBrandsTable($query: TableQueryInput) {
    ecommBrandsTable(query: $query) {
      total
      rows {
        ...EcommBrandRowFields
      }
    }
  }
  ${ECOMM_BRAND_ROW_FIELDS}
`;

/** One brand by id, at any status — the review inbox's row target. */
export const ECOMM_BRAND = gql`
  query EcommBrand($brand_doc_id: ID!) {
    ecommBrand(brand_doc_id: $brand_doc_id) {
      ...EcommBrandRowFields
    }
  }
  ${ECOMM_BRAND_ROW_FIELDS}
`;

/** Approving also grants the brand owner the E-commerce Manager role. */
export const APPROVE_ECOMM_BRAND = gql`
  mutation ApproveEcommBrand($brand_doc_id: ID!, $notes: String, $tags: [String!]) {
    approveEcommBrand(brand_doc_id: $brand_doc_id, notes: $notes, tags: $tags) {
      id
      status
      reviewer_notes
      tags
    }
  }
`;

export const REJECT_ECOMM_BRAND = gql`
  mutation RejectEcommBrand($brand_doc_id: ID!, $notes: String!) {
    rejectEcommBrand(brand_doc_id: $brand_doc_id, notes: $notes) {
      id
      status
      reviewer_notes
    }
  }
`;

/** Row shape consumed by the brand products table columns. */
export interface BrandProductRow {
  id: string;
  product_name: string;
  sku: string;
  image_url?: string | null;
  unit_cost: number;
  selling_price?: number | null;
  inventory_count: number;
  available_count?: number | null;
  commission_pct: number;
  height_cm: number;
  length_cm: number;
  breadth_cm: number;
  weight_kg: number;
  created_at?: string | null;
}

/** Same selection as MARKETPLACE_BRAND_PRODUCTS rows (+ created_at for the Added filter column). */
const BRAND_PRODUCT_ROW_FIELDS = gql`
  fragment BrandProductRowFields on InventoryProduct {
    id
    product_name
    sku
    image_url
    unit_cost
    selling_price
    inventory_count
    available_count
    commission_pct
    height_cm
    length_cm
    breadth_cm
    weight_kg
    created_at
  }
`;

export const MARKETPLACE_BRAND_PRODUCTS_TABLE = gql`
  query MarketplaceBrandProductsTable($brand_doc_id: ID!, $query: TableQueryInput) {
    marketplaceBrandProductsTable(brand_doc_id: $brand_doc_id, query: $query) {
      total
      rows {
        ...BrandProductRowFields
      }
    }
  }
  ${BRAND_PRODUCT_ROW_FIELDS}
`;

export const BRAND_PICKUP_LOCATIONS = gql`
  query BrandPickupLocations($owner_kind: PickupOwnerKind, $brand_doc_id: ID) {
    brandPickupLocations(owner_kind: $owner_kind, brand_doc_id: $brand_doc_id) {
      id
      owner_kind
      brand_id
      nickname
      contact_name
      phone
      email
      address_line1
      address_line2
      city
      state
      pincode
      country
      is_default
      shiprocket_registered
      shiprocket_pickup_id
    }
  }
`;

export const SAVE_BRAND_PICKUP_LOCATION = gql`
  mutation SaveBrandPickupLocation($id: ID, $input: BrandPickupLocationInput!) {
    saveBrandPickupLocation(id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_BRAND_PICKUP_LOCATION = gql`
  mutation DeleteBrandPickupLocation($id: ID!) {
    deleteBrandPickupLocation(id: $id)
  }
`;

export const SET_DEFAULT_BRAND_PICKUP_LOCATION = gql`
  mutation SetDefaultBrandPickupLocation($id: ID!) {
    setDefaultBrandPickupLocation(id: $id) {
      id
      is_default
    }
  }
`;

export const REGISTER_BRAND_PICKUP_WITH_SHIPROCKET = gql`
  mutation RegisterBrandPickupWithShiprocket($id: ID!) {
    registerBrandPickupWithShiprocket(id: $id) {
      id
      shiprocket_registered
      shiprocket_pickup_id
    }
  }
`;
