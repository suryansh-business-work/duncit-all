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
    default_club_admin_pct: Float!
    default_backout_deduction_pct: Float!
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
    "Global backout deduction % applied to a refund when a replacement fills the spot (Default Deductions → Backouts)."
    default_backout_deduction_pct: Float!
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
    default_club_admin_pct: Float
    default_backout_deduction_pct: Float
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
    # Engine version that produced this snapshot (1 = legacy venue-bill lines,
    # 2 = share-of-pool waterfall). v2-only fields are 0 on v1 docs.
    version: Int!
    net_amount: Float!
    platform_fee_pct: Float!
    platform_fee_amount: Float!
    pool_amount: Float!
    share_pct: Float!
    share_amount: Float!
    commission_pct: Float!
    commission_amount: Float!
    duncit_revenue: Float!
  }

  # The complete GST-inclusive money waterfall for one pod (engine v2):
  # payment -> GST extraction -> platform fee -> pool -> the venue's booked
  # slot price (Partners portal) comes off the pool -> the HOST keeps the
  # remainder -> Duncit commission out of each side; duncit_revenue = fee +
  # both commissions.
  type PodFinanceWaterfall {
    version: Int!
    amount: Float!
    gst_pct: Float!
    gst_amount: Float!
    net_amount: Float!
    platform_fee_pct: Float!
    platform_fee_amount: Float!
    pool_amount: Float!
    # Club-admin cut (% + amount) off the pool after GST + platform fee.
    club_admin_pct: Float!
    club_admin_amount: Float!
    # The venue's fixed booked slot price, clamped to the pool.
    venue_amount: Float!
    venue_commission_pct: Float!
    venue_commission_amount: Float!
    venue_receives: Float!
    # The host's remainder: pool - venue_amount.
    host_amount: Float!
    host_commission_pct: Float!
    host_commission_amount: Float!
    host_receives: Float!
    duncit_revenue: Float!
    host_earn_pct: Float!
  }

  enum PodSettlementStatus {
    LIVE
    PENDING_APPROVAL
    SETTLED
  }

  type PodFinanceBreakdown {
    pod_id: ID!
    pod_title: String!
    settlement_status: PodSettlementStatus!
    # true when rendered from the frozen completion snapshot (never drifts).
    frozen: Boolean!
    bookings_count: Int!
    collected_total: Float!
    currency_symbol: String!
    has_venue: Boolean!
    completed_at: String
    waterfall: PodFinanceWaterfall!
  }

  type EarningsSummary {
    currency_symbol: String!
    lifetime_earnings: Float!
    pending_amount: Float!
    pods_completed: Int!
    this_month_earnings: Float!
  }

  "Host Studio pod-status distribution (donut) — cancelled = soft-deleted pods."
  type HostStatusCounts {
    upcoming: Int!
    ongoing: Int!
    completed: Int!
    cancelled: Int!
  }

  "One month's host payout total (bucket = 'YYYY-MM')."
  type HostMonthlyEarning {
    month: String!
    total: Float!
  }

  "Host Studio insights: pod-status distribution + monthly payout series."
  type HostInsights {
    status_counts: HostStatusCounts!
    monthly_earnings: [HostMonthlyEarning!]!
  }

  type FinanceStat {
    total: Float!
    this_month: Float!
    last_month: Float!
    mom_change_pct: Float!
  }

  type FinanceDashboardStats {
    currency_symbol: String!
    total_revenue: FinanceStat!
    duncit_revenue: FinanceStat!
    gst_collected: FinanceStat!
    pending_payouts: FinanceStat!
    completed_payouts: FinanceStat!
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

  "Server-side table page for the shared table engine (paymentReleaseRequestsTable)."
  type PaymentReleaseRequestTablePage {
    rows: [PaymentReleaseRequest!]!
    total: Int!
    page: Int!
    page_size: Int!
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
    host_commission_pct: Float!
    venue_commission_pct: Float!
    host: PodSettlementParty!
    venue: PodSettlementParty
    has_venue: Boolean!
    waterfall: PodFinanceWaterfall!
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
    paymentReleaseRequestsTable(query: TableQueryInput): PaymentReleaseRequestTablePage!
    # Live preview of the host/venue split for a pod given a venue bill.
    podSettlementPreview(pod_id: ID!, venue_bill_amount: Float!): PodSettlement!
    # The signed-in host's own completion payouts (Host Share history).
    myHostPayouts: [PaymentReleaseRequest!]!
    # A venue owner's payouts across every venue they own (Venue Earnings).
    myVenuePayouts: [PaymentReleaseRequest!]!
    # Complete financial breakdown for one pod — frozen snapshot once settled,
    # live at current dynamic rates otherwise. Pod host, venue owner, or admin.
    podFinanceBreakdown(pod_id: ID!): PodFinanceBreakdown!
    # Potential-earnings preview for a hypothetical GST-inclusive price using
    # the signed-in host's effective rates. venue_id resolves the venue's
    # commission %; venue_amount is the picked slot's price (Partners portal).
    potentialPodEarnings(amount: Float!, venue_id: ID, venue_amount: Float): PodFinanceWaterfall!
    # Host Studio dashboard earnings summary (signed-in host).
    myHostEarningsSummary: EarningsSummary!
    # Host Studio insights charts (signed-in host): status distribution
    # (incl. cancelled/soft-deleted) + monthly payout series (default 12 months).
    hostInsights(months: Int): HostInsights!
    # Venue Earnings dashboard summary (signed-in venue owner).
    myVenueEarningsSummary: EarningsSummary!
    # Finance portal dashboard KPI cards (finance roles only).
    financeDashboardStats: FinanceDashboardStats!
  }

  extend type Mutation {
    updateFinanceSettings(input: UpdateFinanceSettingsInput!): FinanceSettings!
    createPaymentReleaseRequest(input: CreatePaymentReleaseInput!): PaymentReleaseRequest!
    reviewPaymentReleaseRequest(request_id: ID!, input: ReviewPaymentReleaseInput!): PaymentReleaseRequest!
    # Host (or admin) completes a pod: enter venue bill + party media, create
    # the reconciled payout releases for Finance to approve.
    completePodSettlement(input: CompletePodInput!): PodSettlementResult!
    # Per-host commission override (0 = inherit the global default).
    setHostDeductions(user_id: ID!, host_commission_pct: Float!): Boolean!
  }
`;
