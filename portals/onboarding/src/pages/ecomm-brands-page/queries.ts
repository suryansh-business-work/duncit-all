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
      status
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
