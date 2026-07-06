import { gql } from '@apollo/client';

export const STATUSES = ['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];

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
