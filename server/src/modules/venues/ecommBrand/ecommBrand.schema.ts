import gql from 'graphql-tag';

export const ecommBrandTypeDefs = gql`
  enum EcommBrandStatus {
    DRAFT
    SUBMITTED
    APPROVED
    REJECTED
  }

  type EcommBrandDocument {
    type: String!
    url: String!
  }

  input EcommBrandDocumentInput {
    type: String!
    url: String!
  }

  type EcommBrand {
    id: ID!
    owner_user_id: ID!
    brand_name: String!
    logo_url: String!
    cover_image_url: String!
    tagline: String!
    description: String!
    product_categories: [String!]!
    website_url: String!
    instagram_url: String!
    contact_person: String!
    contact_email: String!
    contact_phone: String!
    registered_business_name: String!
    gstin: String!
    pan: String!
    established_year: Int
    address_line1: String!
    city: String!
    state: String!
    postal_code: String!
    country: String!
    account_holder_name: String!
    account_number: String!
    ifsc_code: String!
    upi_id: String!
    documents: [EcommBrandDocument!]!
    tags: [String!]!
    status: EcommBrandStatus!
    is_active: Boolean!
    reviewer_notes: String!
    submitted_at: String
    approved_at: String
    rejected_at: String
    created_at: String
    updated_at: String
  }

  input EcommBrandInput {
    brand_name: String
    logo_url: String
    cover_image_url: String
    tagline: String
    description: String
    product_categories: [String!]
    website_url: String
    instagram_url: String
    contact_person: String
    contact_email: String
    contact_phone: String
    registered_business_name: String
    gstin: String
    pan: String
    established_year: Int
    address_line1: String
    city: String
    state: String
    postal_code: String
    country: String
    account_holder_name: String
    account_number: String
    ifsc_code: String
    upi_id: String
    documents: [EcommBrandDocumentInput!]
  }

  extend type Query {
    "The signed-in partner's own e-commerce brand (or null)."
    myEcommBrand: EcommBrand
    "Onboarding/admin: all brands, optionally filtered by status."
    ecommBrands(status: EcommBrandStatus): [EcommBrand!]!
    "Onboarding/admin: a single brand by id."
    ecommBrand(brand_doc_id: ID!): EcommBrand
  }

  extend type Mutation {
    "Partner: create/update the draft brand."
    saveEcommBrand(input: EcommBrandInput!): EcommBrand!
    "Partner: submit the brand for onboarding review."
    submitEcommBrand: EcommBrand!
    "Partner: pull a submitted brand back to draft for edits."
    withdrawEcommBrand: EcommBrand!
    "Onboarding/admin: approve a brand (grants the owner the E-commerce Manager role)."
    approveEcommBrand(brand_doc_id: ID!, notes: String, tags: [String!]): EcommBrand!
    "Onboarding/admin: reject a brand with notes."
    rejectEcommBrand(brand_doc_id: ID!, notes: String!): EcommBrand!
  }
`;
