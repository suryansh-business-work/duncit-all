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

export type BrandIntegrationProvider = 'SHIPROCKET' | 'RAZORPAY';

/** One brand integration as the console reads it — the secret never leaves
 * the server; `identifier` is the public half and `has_secret` says whether
 * the other half is on file. */
export interface BrandIntegrationStatus {
  provider: BrandIntegrationProvider;
  configured: boolean;
  connected: boolean;
  checked_at?: string | null;
  message: string;
  details: string[];
  identifier: string;
  has_secret: boolean;
  /** ShipRocket: the default pickup nickname on that account. */
  pickup_location: string;
  /** Razorpay: the key id is a live key, so real money moves. */
  live_mode: boolean;
  has_webhook_secret: boolean;
}

export interface BrandIntegrations {
  shiprocket: BrandIntegrationStatus;
  razorpay: BrandIntegrationStatus;
}

/** The Brand Consent (Legal portal) as the partner signed it. */
export interface BrandConsent {
  accepted: boolean;
  signed_name: string;
  signed_at?: string | null;
  policy_slug: string;
  policy_title: string;
  /** sha256 of the wording that was signed. */
  content_hash: string;
  /** Signed against the consent's CURRENT wording. False once Legal edits it. */
  current: boolean;
  /** Legal has published a Brand Consent to sign. */
  available: boolean;
}

export interface BrandStepState {
  key: string;
  complete: boolean;
  required: boolean;
}

/** Wizard progress — required steps done, as a percentage. */
export interface BrandCompletion {
  percent: number;
  next_step: number;
  steps: BrandStepState[];
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
  address_line1?: string | null;
  postal_code?: string | null;
  country?: string | null;
  established_year?: number | null;
  account_holder_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  upi_id?: string | null;
  completion: BrandCompletion;
  integrations: BrandIntegrations;
  consent: BrandConsent;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  created_at?: string | null;
}

/** Every field of one integration — read by the row AND returned by a re-check. */
const BRAND_INTEGRATION_STATUS_FIELDS = gql`
  fragment BrandIntegrationStatusFields on BrandIntegrationStatus {
    provider
    configured
    connected
    checked_at
    message
    details
    identifier
    has_secret
    pickup_location
    live_mode
    has_webhook_secret
  }
`;

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
    address_line1
    postal_code
    country
    established_year
    account_holder_name
    account_number
    ifsc_code
    upi_id
    completion {
      percent
      next_step
      steps {
        key
        complete
        required
      }
    }
    integrations {
      shiprocket {
        ...BrandIntegrationStatusFields
      }
      razorpay {
        ...BrandIntegrationStatusFields
      }
    }
    consent {
      accepted
      signed_name
      signed_at
      policy_slug
      policy_title
      content_hash
      current
      available
    }
    submitted_at
    approved_at
    rejected_at
    created_at
  }
  ${BRAND_INTEGRATION_STATUS_FIELDS}
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

/** Check a brand's saved credential against the vendor during review. */
export const REVIEW_BRAND_INTEGRATION = gql`
  mutation ReviewBrandIntegration($brand_doc_id: ID!, $provider: BrandIntegrationProvider!) {
    reviewBrandIntegration(brand_doc_id: $brand_doc_id, provider: $provider) {
      ...BrandIntegrationStatusFields
    }
  }
  ${BRAND_INTEGRATION_STATUS_FIELDS}
`;

/** Reversible hide of the brand and its products from the shop and the pod picker. */
export const SET_ECOMM_BRAND_ACTIVE = gql`
  mutation SetEcommBrandActive($brand_doc_id: ID!, $active: Boolean!) {
    setEcommBrandActive(brand_doc_id: $brand_doc_id, active: $active) {
      id
      is_active
    }
  }
`;

/** Delete a brand that is not approved (or approved with no products). The owner is told. */
export const ADMIN_DELETE_ECOMM_BRAND = gql`
  mutation AdminDeleteEcommBrand($brand_doc_id: ID!, $notes: String) {
    adminDeleteEcommBrand(brand_doc_id: $brand_doc_id, notes: $notes)
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
      review_status
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
      shiprocket_error
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
      shiprocket_error
      shiprocket_pickup_id
    }
  }
`;
