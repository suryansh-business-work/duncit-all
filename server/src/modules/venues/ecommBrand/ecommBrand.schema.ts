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

  "The two accounts a brand ships and gets paid through. Each brand holds its own — never the Tech portal's."
  enum BrandIntegrationProvider {
    SHIPROCKET
    RAZORPAY
  }

  """
  One brand integration as the console reads it. The secret (ShipRocket
  password, Razorpay key secret) never leaves the server; \`has_secret\` says
  whether one is on file and \`identifier\` is the public half (the API user's
  email, the Razorpay key id).
  """
  type BrandIntegrationStatus {
    provider: BrandIntegrationProvider!
    "Both halves of the credential are on file."
    configured: Boolean!
    "The vendor accepted the credential the last time it was checked."
    connected: Boolean!
    checked_at: String
    "What the vendor answered, for a person to read. Never a credential."
    message: String!
    details: [String!]!
    identifier: String!
    has_secret: Boolean!
    "ShipRocket: the default pickup nickname on that account."
    pickup_location: String!
    "Razorpay: the key id is a live key (rzp_live_…), so real money moves."
    live_mode: Boolean!
    "A webhook secret is on file for this account."
    has_webhook_secret: Boolean!
  }

  type BrandIntegrations {
    shiprocket: BrandIntegrationStatus!
    razorpay: BrandIntegrationStatus!
  }

  "The Brand Consent (Legal portal) as the partner signed it."
  type BrandConsent {
    accepted: Boolean!
    signed_name: String!
    signed_at: String
    policy_slug: String!
    policy_title: String!
    "sha256 of the wording that was signed."
    content_hash: String!
    "The signature is against the consent's CURRENT wording. False once Legal edits it."
    current: Boolean!
    "Legal has published a Brand Consent to sign. Without one the step has nothing to show."
    available: Boolean!
  }

  type BrandStepState {
    key: String!
    complete: Boolean!
    required: Boolean!
  }

  "How far the brand is through the onboarding wizard — the % in the Your brands table."
  type BrandCompletion {
    percent: Int!
    steps: [BrandStepState!]!
    "The first step still to do, for the wizard to open on."
    next_step: Int!
  }

  input BrandShiprocketInput {
    "The ShipRocket API user's email (Settings → API → Configure)."
    email: String!
    "Omitted or blank keeps the password already on file."
    password: String
    "Default pickup nickname on that account — must match a ShipRocket pickup address."
    pickup_location: String
    "Omitted or blank keeps the one on file."
    webhook_secret: String
  }

  input BrandRazorpayInput {
    key_id: String!
    "Omitted or blank keeps the secret already on file."
    key_secret: String
    webhook_secret: String
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
    "Permanent human id (BRD-000001) — Onboarded Brands table."
    brand_no: String
    status: EcommBrandStatus!
    is_active: Boolean!
    reviewer_notes: String!
    # E-commerce: the brand's default ShipRocket pickup/warehouse location.
    default_pickup_location_id: ID
    # E-commerce: number of this brand's APPROVED products (resolved).
    approved_product_count: Int!
    "The brand's own ShipRocket and Razorpay accounts, and whether each connects."
    integrations: BrandIntegrations!
    "The Brand Consent as signed by the owner."
    consent: BrandConsent!
    "Wizard progress — required steps done, as a percentage."
    completion: BrandCompletion!
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

  "Server-side table page for the shared table engine (DUNCIT TABLE CONTRACT v1)."
  type EcommBrandTablePage {
    rows: [EcommBrand!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "The signed-in partner's e-commerce brands (a partner may run several)."
    myEcommBrands: [EcommBrand!]!
    "Server-side table sibling of myEcommBrands — always scoped to the caller's own brands."
    myEcommBrandsTable(query: TableQueryInput): EcommBrandTablePage!
    "Onboarding/admin: all brands, optionally filtered by status."
    ecommBrands(status: EcommBrandStatus): [EcommBrand!]!
    "Server-side table sibling of ecommBrands (shared table engine)."
    ecommBrandsTable(query: TableQueryInput): EcommBrandTablePage!
    "Products portal e-commerce: external brands (default APPROVED) + approved-product counts."
    marketplaceBrands(status: EcommBrandStatus): [EcommBrand!]!
    "Server-side table sibling of marketplaceBrands (shared table engine; active brands only)."
    marketplaceBrandsTable(query: TableQueryInput): EcommBrandTablePage!
    "Onboarding/admin: a single brand by id."
    ecommBrand(brand_doc_id: ID!): EcommBrand
    "Public brand card for the pod product-detail brand dialog (any signed-in user; select only non-sensitive fields client-side)."
    publicEcommBrand(brand_doc_id: ID!): EcommBrand
    "Partner: one of the caller's own brands, at any status — what the brand wizard opens."
    myEcommBrand(brand_doc_id: ID!): EcommBrand
    "The Brand Consent Legal publishes for brand partners to sign (slug brand-partner-consent). Null until Legal writes one."
    brandConsentPolicy: Policy
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
    "Partner: temporarily deactivate/reactivate an OWN brand — same reversible hide as setEcommBrandActive; placed orders are unaffected."
    setMyEcommBrandActive(brand_doc_id: ID!, active: Boolean!): EcommBrand!
    "Developer-only permanent delete. Re-confirm with your own email + password. Cannot be undone; blocked if the brand still has products."
    deleteEcommBrand(brand_doc_id: ID!, email: String!, password: String!): Boolean!
    "Partner: save the brand's ShipRocket API user and check it against ShipRocket right away."
    connectBrandShiprocket(brand_doc_id: ID!, input: BrandShiprocketInput!): BrandIntegrationStatus!
    "Partner: save the brand's Razorpay keys and check them against Razorpay right away."
    connectBrandRazorpay(brand_doc_id: ID!, input: BrandRazorpayInput!): BrandIntegrationStatus!
    "Partner: check the saved credential again without changing it."
    recheckBrandIntegration(brand_doc_id: ID!, provider: BrandIntegrationProvider!): BrandIntegrationStatus!
    "Partner: forget the saved credential. The brand drops out of review until it is reconnected."
    disconnectBrandIntegration(brand_doc_id: ID!, provider: BrandIntegrationProvider!): BrandIntegrationStatus!
    "Partner: accept the Brand Consent and sign it by typing their full name. Recorded in the Legal acceptance log."
    signBrandConsent(brand_doc_id: ID!, signed_name: String!): BrandConsent!
    "Partner: delete an OWN brand. Refused for an approved brand that still has products — deactivate it instead."
    deleteMyEcommBrand(brand_doc_id: ID!): Boolean!
    "Products portal: check a submitted brand's credential against the vendor during review."
    reviewBrandIntegration(brand_doc_id: ID!, provider: BrandIntegrationProvider!): BrandIntegrationStatus!
    "Products portal: delete a brand that is not approved (or approved with no products). The owner is told."
    adminDeleteEcommBrand(brand_doc_id: ID!, notes: String): Boolean!
  }
`;
