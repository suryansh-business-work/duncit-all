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

  enum PayoutMode {
    IMMEDIATE
    WEEKLY
    MONTH_END
  }

  type PartyInvoiceTemplate {
    label: String!
    terms: String!
    footer: String!
    note: String!
  }

  type InvoiceTemplates {
    venue: PartyInvoiceTemplate!
    host: PartyInvoiceTemplate!
    product: PartyInvoiceTemplate!
  }

  input PartyInvoiceTemplateInput {
    label: String
    terms: String
    footer: String
    note: String
  }

  input InvoiceTemplatesInput {
    venue: PartyInvoiceTemplateInput
    host: PartyInvoiceTemplateInput
    product: PartyInvoiceTemplateInput
  }

  type FinanceSettings {
    platform_fee_pct: Float!
    gst_pct: Float!
    default_host_share_pct: Float!
    default_host_commission_pct: Float!
    default_venue_share_pct: Float!
    default_venue_commission_pct: Float!
    default_product_commission_pct: Float!
    venue_payout_mode: PayoutMode!
    host_payout_mode: PayoutMode!
    payout_day_of_week: Int!
    payout_time: String!
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
    invoice_templates: InvoiceTemplates!
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
    default_host_share_pct: Float
    default_host_commission_pct: Float
    default_venue_share_pct: Float
    default_venue_commission_pct: Float
    default_product_commission_pct: Float
    venue_payout_mode: PayoutMode
    host_payout_mode: PayoutMode
    payout_day_of_week: Int
    payout_time: String
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
    invoice_templates: InvoiceTemplatesInput
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

  type PaymentReleaseBreakdown {
    collected_total: Float!
    venue_bill: Float!
    gst_pct: Float!
    gst_amount: Float!
    duncit_pct: Float!
    duncit_amount: Float!
    payout_pct: Float!
    payout_amount: Float!
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
    breakdown: PaymentReleaseBreakdown
    created_at: String!
    updated_at: String!
  }

  # One party's reconciled settlement lines for a completed pod.
  type PodSettlementParty {
    collected_total: Float!
    venue_bill: Float!
    gst_pct: Float!
    gst_amount: Float!
    duncit_pct: Float!
    duncit_amount: Float!
    payout_pct: Float!
    payout_amount: Float!
  }

  type PodSettlement {
    pod_id: ID!
    pod_title: String!
    currency_symbol: String!
    collected_total: Float!
    venue_bill: Float!
    gst_pct: Float!
    host_share_pct: Float!
    host_commission_pct: Float!
    venue_share_pct: Float!
    venue_commission_pct: Float!
    host: PodSettlementParty!
    venue: PodSettlementParty
    has_venue: Boolean!
  }

  type PodSettlementResult {
    settlement: PodSettlement!
    releases: [PaymentReleaseRequest!]!
  }

  input CompletePodInput {
    pod_id: ID!
    venue_bill_amount: Float!
    bill_url: String
    host_user_id: ID
    evidence_media: [PaymentReleaseMediaInput!]
    notes: String
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
    # Live preview of the host/venue split for a pod given a venue bill.
    podSettlementPreview(pod_id: ID!, venue_bill_amount: Float!): PodSettlement!
    # The signed-in host's own completion payouts (Host Share history).
    myHostPayouts: [PaymentReleaseRequest!]!
  }

  extend type Mutation {
    updateFinanceSettings(input: UpdateFinanceSettingsInput!): FinanceSettings!
    createPaymentReleaseRequest(input: CreatePaymentReleaseInput!): PaymentReleaseRequest!
    reviewPaymentReleaseRequest(request_id: ID!, input: ReviewPaymentReleaseInput!): PaymentReleaseRequest!
    # Host (or admin) completes a pod: enter venue bill + party media, create
    # the reconciled payout releases for Finance to approve.
    completePodSettlement(input: CompletePodInput!): PodSettlementResult!
  }
`;
