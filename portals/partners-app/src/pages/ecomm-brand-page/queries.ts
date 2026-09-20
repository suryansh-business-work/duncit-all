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
  is_active
  reviewer_notes
  submitted_at
  approved_at
`;

/** Every field of BrandIntegrationStatus — the one selection each integration read uses. */
export const BRAND_INTEGRATION_FIELDS = `
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
`;

const BRAND_CONSENT_FIELDS = `
  accepted
  signed_name
  signed_at
  policy_slug
  policy_title
  content_hash
  current
  available
`;

const BRAND_COMPLETION_FIELDS = `
  percent
  next_step
  steps { key complete required }
`;

/** The wizard's brand: the saved facts plus the server-judged integrations, consent and progress. */
const BRAND_WIZARD_FIELDS = `
  ${BRAND_FIELDS}
  integrations {
    shiprocket { ${BRAND_INTEGRATION_FIELDS} }
    razorpay { ${BRAND_INTEGRATION_FIELDS} }
  }
  consent { ${BRAND_CONSENT_FIELDS} }
  completion { ${BRAND_COMPLETION_FIELDS} }
`;

export const MY_BRANDS = gql`
  query MyEcommBrands {
    me { user_id full_name email roles }
    myEcommBrands { ${BRAND_FIELDS} }
  }
`;

/** Server-paged sibling of myEcommBrands (shared table engine). Rows keep the
 * full BRAND_FIELDS selection plus the progress and connection facts the
 * "Your brands" table shows. */
export const MY_BRANDS_TABLE = gql`
  query MyEcommBrandsTable($query: TableQueryInput) {
    myEcommBrandsTable(query: $query) {
      total
      rows {
        ${BRAND_FIELDS}
        created_at
        updated_at
        completion { percent }
        integrations { shiprocket { connected } razorpay { connected } }
      }
    }
  }
`;

/** The signed-in account — a new brand's contact email starts as its address. */
export const MY_ACCOUNT = gql`
  query BrandWizardAccount {
    me { user_id email }
  }
`;

/** One own brand at any status — what the wizard opens. */
export const MY_BRAND = gql`
  query MyEcommBrand($brand_doc_id: ID!) {
    myEcommBrand(brand_doc_id: $brand_doc_id) { ${BRAND_WIZARD_FIELDS} }
  }
`;

export const SAVE_BRAND = gql`
  mutation SaveEcommBrand($brand_doc_id: ID, $input: EcommBrandInput!) {
    saveEcommBrand(brand_doc_id: $brand_doc_id, input: $input) { ${BRAND_WIZARD_FIELDS} }
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

/** Temporarily hide/show an own brand (and all its products) in the shop. */
export const SET_MY_BRAND_ACTIVE = gql`
  mutation SetMyEcommBrandActive($brand_doc_id: ID!, $active: Boolean!) {
    setMyEcommBrandActive(brand_doc_id: $brand_doc_id, active: $active) { id is_active }
  }
`;

export const DELETE_MY_BRAND = gql`
  mutation DeleteMyEcommBrand($brand_doc_id: ID!) {
    deleteMyEcommBrand(brand_doc_id: $brand_doc_id)
  }
`;

export const CONNECT_BRAND_SHIPROCKET = gql`
  mutation ConnectBrandShiprocket($brand_doc_id: ID!, $input: BrandShiprocketInput!) {
    connectBrandShiprocket(brand_doc_id: $brand_doc_id, input: $input) { ${BRAND_INTEGRATION_FIELDS} }
  }
`;

export const CONNECT_BRAND_RAZORPAY = gql`
  mutation ConnectBrandRazorpay($brand_doc_id: ID!, $input: BrandRazorpayInput!) {
    connectBrandRazorpay(brand_doc_id: $brand_doc_id, input: $input) { ${BRAND_INTEGRATION_FIELDS} }
  }
`;

export const RECHECK_BRAND_INTEGRATION = gql`
  mutation RecheckBrandIntegration($brand_doc_id: ID!, $provider: BrandIntegrationProvider!) {
    recheckBrandIntegration(brand_doc_id: $brand_doc_id, provider: $provider) { ${BRAND_INTEGRATION_FIELDS} }
  }
`;

export const DISCONNECT_BRAND_INTEGRATION = gql`
  mutation DisconnectBrandIntegration($brand_doc_id: ID!, $provider: BrandIntegrationProvider!) {
    disconnectBrandIntegration(brand_doc_id: $brand_doc_id, provider: $provider) { ${BRAND_INTEGRATION_FIELDS} }
  }
`;

export const BRAND_CONSENT_POLICY = gql`
  query BrandConsentPolicy {
    brandConsentPolicy { id slug title content is_active updated_at }
  }
`;

export const SIGN_BRAND_CONSENT = gql`
  mutation SignBrandConsent($brand_doc_id: ID!, $signed_name: String!) {
    signBrandConsent(brand_doc_id: $brand_doc_id, signed_name: $signed_name) { ${BRAND_CONSENT_FIELDS} }
  }
`;

export interface BrandDocument {
  type: string;
  url: string;
}

export type BrandIntegrationProvider = 'SHIPROCKET' | 'RAZORPAY';

export interface BrandIntegrationStatus {
  provider: BrandIntegrationProvider;
  configured: boolean;
  connected: boolean;
  checked_at: string | null;
  message: string;
  details: string[];
  identifier: string;
  has_secret: boolean;
  pickup_location: string;
  live_mode: boolean;
  has_webhook_secret: boolean;
}

export interface BrandIntegrations {
  shiprocket: BrandIntegrationStatus;
  razorpay: BrandIntegrationStatus;
}

export interface BrandConsent {
  accepted: boolean;
  signed_name: string;
  signed_at: string | null;
  policy_slug: string;
  policy_title: string;
  content_hash: string;
  current: boolean;
  available: boolean;
}

export interface BrandCompletion {
  percent: number;
  next_step: number;
  steps: { key: string; complete: boolean; required: boolean }[];
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
  is_active: boolean;
  reviewer_notes: string;
  submitted_at: string | null;
  approved_at: string | null;
  /** Present on the wizard's `myEcommBrand` read and on table rows (connected flags only). */
  integrations?: BrandIntegrations;
  consent?: BrandConsent;
  completion?: BrandCompletion;
}

/** Table rows add the sort timestamps on top of the wizard's brand shape. */
export interface EcommBrandRow extends EcommBrand {
  created_at?: string | null;
  updated_at?: string | null;
}
