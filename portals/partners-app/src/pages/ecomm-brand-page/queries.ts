import { gql } from '@apollo/client';

const BRAND_FIELDS = `
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
`;

export const MY_BRANDS = gql`
  query MyEcommBrands {
    me { user_id full_name email roles }
    myEcommBrands { ${BRAND_FIELDS} }
  }
`;

export const SAVE_BRAND = gql`
  mutation SaveEcommBrand($brand_doc_id: ID, $input: EcommBrandInput!) {
    saveEcommBrand(brand_doc_id: $brand_doc_id, input: $input) { ${BRAND_FIELDS} }
  }
`;

export const SUBMIT_BRAND = gql`
  mutation SubmitEcommBrand($brand_doc_id: ID!) {
    submitEcommBrand(brand_doc_id: $brand_doc_id) { id status submitted_at }
  }
`;

export const WITHDRAW_BRAND = gql`
  mutation WithdrawEcommBrand($brand_doc_id: ID!) {
    withdrawEcommBrand(brand_doc_id: $brand_doc_id) { id status }
  }
`;

export interface BrandDocument {
  type: string;
  url: string;
}

export interface EcommBrand {
  id: string;
  brand_name: string;
  logo_url: string;
  cover_image_url: string;
  tagline: string;
  description: string;
  product_categories: string[];
  website_url: string;
  instagram_url: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  registered_business_name: string;
  gstin: string;
  pan: string;
  established_year: number | null;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
  documents: BrandDocument[];
  tags: string[];
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  reviewer_notes: string;
  submitted_at: string | null;
  approved_at: string | null;
}
