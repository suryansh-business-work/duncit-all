import { gql } from '@apollo/client';

export const STATUSES = ['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];

/** Status options for the table's select filter ('' All entry excluded). */
export const STATUS_OPTIONS = STATUSES.filter(Boolean).map((s) => ({ value: s, label: s }));

/** Row shape used by the brands table columns; rows also carry the full
 * EcommBrandRowFields selection so the Edit/Review dialogs can reuse the row object. */
export interface EcommBrandRow {
  id: string;
  brand_no?: string | null;
  brand_name?: string | null;
  logo_url?: string | null;
  tagline?: string | null;
  product_categories?: string[] | null;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  city?: string | null;
  status: string;
  is_active?: boolean | null;
  approved_product_count?: number | null;
  product_commission_pct?: number | null;
  submitted_at?: string | null;
}

export const ECOMM_BRANDS = gql`
  query EcommBrands($status: EcommBrandStatus) {
    ecommBrands(status: $status) {
      id
      brand_name
      logo_url
      cover_image_url
      tagline
      description
      product_categories
      website_url
      instagram_url
      contact_person
      contact_email
      contact_phone
      registered_business_name
      gstin
      pan
      established_year
      address_line1
      city
      state
      postal_code
      country
      account_holder_name
      account_number
      ifsc_code
      upi_id
      documents { type url }
      tags
      product_commission_pct
      status
      is_active
      approved_product_count
      reviewer_notes
      submitted_at
      approved_at
    }
  }
`;

/** Same selection as ECOMM_BRANDS rows (+ created_at for the hidden Created
 * filter column) so table rows keep feeding the Edit/Review dialogs without refetch. */
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
    website_url
    instagram_url
    contact_person
    contact_email
    contact_phone
    registered_business_name
    gstin
    pan
    established_year
    address_line1
    city
    state
    postal_code
    country
    account_holder_name
    account_number
    ifsc_code
    upi_id
    documents { type url }
    tags
    product_commission_pct
    status
    is_active
    approved_product_count
    reviewer_notes
    submitted_at
    approved_at
    created_at
  }
`;

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

export const APPROVE_BRAND = gql`
  mutation ApproveEcommBrand($id: ID!, $notes: String, $tags: [String!]) {
    approveEcommBrand(brand_doc_id: $id, notes: $notes, tags: $tags) {
      id
    }
  }
`;

export const REJECT_BRAND = gql`
  mutation RejectEcommBrand($id: ID!, $notes: String!) {
    rejectEcommBrand(brand_doc_id: $id, notes: $notes) {
      id
    }
  }
`;

export const ADMIN_UPDATE_ECOMM_BRAND = gql`
  mutation AdminUpdateEcommBrand(
    $id: ID!
    $input: EcommBrandInput!
    $status: EcommBrandStatus
  ) {
    adminUpdateEcommBrand(brand_doc_id: $id, input: $input, status: $status) {
      id
    }
  }
`;

export const SET_BRAND_COMMISSION = gql`
  mutation SetBrandCommission($id: ID!, $product_commission_pct: Float!) {
    setBrandCommission(brand_doc_id: $id, product_commission_pct: $product_commission_pct) {
      id
      product_commission_pct
    }
  }
`;

export const SET_ECOMM_BRAND_ACTIVE = gql`
  mutation SetEcommBrandActive($id: ID!, $active: Boolean!) {
    setEcommBrandActive(brand_doc_id: $id, active: $active) {
      id
      is_active
    }
  }
`;

export const DELETE_ECOMM_BRAND = gql`
  mutation DeleteEcommBrand($id: ID!, $email: String!, $password: String!) {
    deleteEcommBrand(brand_doc_id: $id, email: $email, password: $password)
  }
`;

export const DOC_TYPES = [
  'GST Certificate',
  'PAN Card',
  'Business Registration',
  'Trademark Certificate',
  'Other',
];
