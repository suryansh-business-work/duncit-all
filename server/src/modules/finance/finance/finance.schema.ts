export const financeTypeDefs = /* GraphQL */ `
  enum BankPayoutMethod {
    UPI
    IMPS
    NEFT
  }

  type BankAccountVerification {
    payout_method: BankPayoutMethod
    account_holder_name: String!
    account_number: String!
    ifsc_code: String!
    upi_id: String!
  }

  input BankAccountVerificationInput {
    payout_method: BankPayoutMethod
    account_holder_name: String
    account_number: String
    ifsc_code: String
    upi_id: String
  }

  type FinanceSettings {
    platform_fee_pct: Float!
    gst_pct: Float!
    currency_symbol: String!
    invoice_prefix: String!
    dummy_mode: Boolean!
    business_name: String!
    business_address: String!
    business_gstin: String!
    invoice_label: String!
    invoice_support_email: String!
    invoice_support_phone: String!
    invoice_footer_note: String!
    invoice_terms: String!
    invoice_logo_url: String!
    updated_at: String!
  }

  type PublicFinanceSettings {
    platform_fee_pct: Float!
    gst_pct: Float!
    currency_symbol: String!
    dummy_mode: Boolean!
    razorpay_enabled: Boolean!
  }

  input UpdateFinanceSettingsInput {
    platform_fee_pct: Float
    gst_pct: Float
    currency_symbol: String
    invoice_prefix: String
    dummy_mode: Boolean
    business_name: String
    business_address: String
    business_gstin: String
    invoice_label: String
    invoice_support_email: String
    invoice_support_phone: String
    invoice_footer_note: String
    invoice_terms: String
    invoice_logo_url: String
  }

  enum PaymentReleaseKind {
    VENUE_BILLING
    HOST_PAYMENT
  }

  enum PaymentReleaseStatus {
    PENDING
    APPROVED
    REJECTED
  }

  enum PaymentReleaseApprovalType {
    FULL
    PARTIAL
  }

  type PaymentReleaseMedia {
    url: String!
    type: CategoryMediaType!
  }

  input PaymentReleaseMediaInput {
    url: String!
    type: CategoryMediaType
  }

  type PaymentReleaseRequest {
    id: ID!
    release_id: String!
    kind: PaymentReleaseKind!
    status: PaymentReleaseStatus!
    pod_id: ID!
    pod_title: String!
    venue_id: ID
    host_user_id: ID
    beneficiary_name: String!
    beneficiary_email: String!
    amount_requested: Float!
    bill_url: String!
    evidence_media: [PaymentReleaseMedia!]!
    notes: String!
    requested_by: ID
    requested_at: String!
    reviewed_by: ID
    reviewed_at: String
    approval_type: PaymentReleaseApprovalType
    approved_amount: Float
    approval_reason: String!
    created_at: String!
    updated_at: String!
  }

  input PaymentReleaseFilterInput {
    status: PaymentReleaseStatus
    kind: PaymentReleaseKind
  }

  input CreatePaymentReleaseInput {
    pod_id: ID!
    kind: PaymentReleaseKind!
    host_user_id: ID
    amount_requested: Float!
    bill_url: String
    evidence_media: [PaymentReleaseMediaInput!]
    notes: String
  }

  input ReviewPaymentReleaseInput {
    status: PaymentReleaseStatus!
    approval_type: PaymentReleaseApprovalType
    approved_amount: Float
    approval_reason: String
  }

  extend type Query {
    financeSettings: FinanceSettings!
    publicFinanceSettings: PublicFinanceSettings!
    paymentReleaseRequests(filter: PaymentReleaseFilterInput): [PaymentReleaseRequest!]!
  }

  extend type Mutation {
    updateFinanceSettings(input: UpdateFinanceSettingsInput!): FinanceSettings!
    createPaymentReleaseRequest(input: CreatePaymentReleaseInput!): PaymentReleaseRequest!
    reviewPaymentReleaseRequest(request_id: ID!, input: ReviewPaymentReleaseInput!): PaymentReleaseRequest!
  }
`;
