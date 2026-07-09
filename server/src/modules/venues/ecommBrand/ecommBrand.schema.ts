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
    # Duncit commission % on all this brand's product sales (0 = inherit).
    product_commission_pct: Float!
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
    # E-commerce: the brand's default ShipRocket pickup/warehouse location.
    default_pickup_location_id: ID
    # E-commerce: number of this brand's APPROVED products (resolved).
    approved_product_count: Int!
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
    "The signed-in partner's e-commerce brands (a partner may run several)."
    myEcommBrands: [EcommBrand!]!
    "Onboarding/admin: all brands, optionally filtered by status."
    ecommBrands(status: EcommBrandStatus): [EcommBrand!]!
    "Products portal e-commerce: external brands (default APPROVED) + approved-product counts."
    marketplaceBrands(status: EcommBrandStatus): [EcommBrand!]!
    "Onboarding/admin: a single brand by id."
    ecommBrand(brand_doc_id: ID!): EcommBrand
    "Public brand card for the pod product-detail brand dialog (any signed-in user; select only non-sensitive fields client-side)."
    publicEcommBrand(brand_doc_id: ID!): EcommBrand
  }

  extend type Mutation {
    "Partner: create a new brand (omit brand_doc_id) or update an owned draft."
    saveEcommBrand(brand_doc_id: ID, input: EcommBrandInput!): EcommBrand!
    "Partner: submit an owned brand for onboarding review."
    submitEcommBrand(brand_doc_id: ID!): EcommBrand!
    "Partner: pull a submitted brand back to draft for edits."
    withdrawEcommBrand(brand_doc_id: ID!): EcommBrand!
    "Onboarding/admin: approve a brand (grants the owner the E-commerce Manager role)."
    approveEcommBrand(brand_doc_id: ID!, notes: String, tags: [String!]): EcommBrand!
    "Onboarding/admin: reject a brand with notes."
    rejectEcommBrand(brand_doc_id: ID!, notes: String!): EcommBrand!
    "Onboarding/admin: edit any brand (e.g. complete an approval-created draft) and optionally set its status."
    adminUpdateEcommBrand(brand_doc_id: ID!, input: EcommBrandInput!, status: EcommBrandStatus): EcommBrand!
    "Onboarding/finance: brand-level Duncit commission %% override on product sales (0 = inherit)."
    setBrandCommission(brand_doc_id: ID!, product_commission_pct: Float!): EcommBrand!
    "Onboarding/admin: deactivate/reactivate a brand — hides it + its products from the marketplace and pod product picker (reversible)."
    setEcommBrandActive(brand_doc_id: ID!, active: Boolean!): EcommBrand!
    "Developer-only permanent delete. Re-confirm with your own email + password. Cannot be undone; blocked if the brand still has products."
    deleteEcommBrand(brand_doc_id: ID!, email: String!, password: String!): Boolean!
  }
`;
