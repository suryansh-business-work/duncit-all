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
    "Working days a refund takes to reach the customer, as quoted in every cancellation message."
    refund_processing_days: Int!
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
    refund_processing_days: Int
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
    "The club-admin cut of a completed pod, paid to the club's admin user."
    CLUB_ADMIN
    """
    An e-commerce brand's product-sale earnings on a completed pod, paid to the
    seller who listed the stock. The amount is the gross buyers paid minus the
    Duncit commission — the same net the seller's product invoice bills.
    """
    ECOMM_PAYMENT
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
    """
    The attendance this payout was computed from, frozen at completion.

    A pod settles on the seats a host scanned in, and a later scan changes the
    pod's attendance — so these cannot be re-derived when the release is
    reviewed, only read back. 0 on snapshots written before attendance drove
    the money.
    """
    attended_seats: Int!
    booked_seats: Int!
    "Money from the attended bookings — what the waterfall started from."
    attended_total: Float!
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

  # Create-a-Pod earnings projection. The host's own spot is FREE, so the pod is
  # billed on payable_spots (= total_spots - 1), never the raw spot count.
  type PodEarningsProjection {
    "Spots the host entered (physical capacity, including the host's own seat)."
    total_spots: Int!
    "Spots that can actually be sold: total_spots - 1 (0 when unset/unlimited)."
    payable_spots: Int!
    """
    The most a venue's slot can cost before the host earns nothing: the pool
    left after GST, the platform fee and the club-admin cut. The create and
    enrol guards refuse a venue priced at or above it, so a console can state
    the ceiling before any venue is chosen — an Auto Pod has none yet.
    """
    venue_budget: Float!
    waterfall: PodFinanceWaterfall!
  }

  """
  One row of the Create-a-Pod Step-4 "Suggested Ticket Prices" table: an ₹x99
  candidate ticket price and the host's projected payout at that price (every
  payable spot sold, all deductions applied at the caller's effective rates).
  """
  type SuggestedTicketPrice {
    price: Float!
    host_receives: Float!
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
    """
    Duncit Coins spent across this pod's successful bookings. Cash the pod never
    collected: coins cut the gross before GST, so collected_total is lower by
    this much than the tickets' face value. Stating it is what makes the gap
    explainable instead of looking like missing money.
    """
    coins_redeemed_total: Float!
    "Coins this pod's bookings paid back to buyers as reward."
    coins_earned_total: Float!
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
    "What Duncit itself spent to run pods (Finance > Pod Expenses)."
    pod_expenses: FinanceStat!
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
    """
    SEATS the settlement was computed on — the ones a host scanned in. Kept
    under its original name for older consumers; attended_seats is the same
    number under the name that now describes it.
    """
    paying_attendees: Int!
    "Seats a host scanned in at the door. The settlement basis."
    attended_seats: Int!
    "Seats booked on the pod, attended or not — the denominator beside it."
    booked_seats: Int!
    "Money from the attended bookings: what the waterfall was computed from."
    attended_total: Float!
    "Every JOINED booking, attended first — the completion roster."
    attendees: [PodSettlementAttendee!]!
    "When the host's window to complete this pod runs out (ISO). Null when the pod has no usable start time."
    complete_deadline: String
    "True once that window has passed with the pod still uncompleted — the host can no longer mark attendance and their share of this pod is nil."
    complete_expired: Boolean!
    "What the host is actually paid on completion: the floored host remainder, or 0 once the completion window has expired."
    host_payout_amount: Float!
  }

  """
  One booking on the completion roster.

  Attendance is not stored on the membership — it happens when a host scans a
  ticket at the door, so a booking counts as attended when its ticket reads
  CHECKED_IN. Seats, not people: one booking can admit several.
  """
  type PodSettlementAttendee {
    membership_id: ID!
    user_id: ID!
    name: String!
    seats: Int!
    attended: Boolean!
    attended_at: String
    "What this booking paid. Zero on a free pod."
    amount: Float!
  }

  type PodSettlementResult {
    settlement: PodSettlement!
    releases: [PaymentReleaseRequest!]!
  }

  input CompletePodInput {
    pod_id: ID!
    venue_bill_amount: Float!
    host_user_id: ID
    evidence_media: [PaymentReleaseMediaInput!]
    notes: String
  }

  input PaymentReleaseFilterInput {
    status: PaymentReleaseStatus
    kind: PaymentReleaseKind
  }

  "Who cancelled a pod — Finance's Cancel & Refunds pages split on this."
  enum PodCancelKind {
    HOST
    VENUE
    ADMIN
    CLUB_ADMIN
    SYSTEM
  }

  "One cancelled pod with its refund money and the venue's booked amount."
  type PodCancellation {
    pod_id: ID!
    pod_slug: String!
    pod_title: String!
    kind: PodCancelKind!
    "Free-text cancellation reason (delete reason / venue decline reason)."
    reason: String!
    actor_name: String!
    cancelled_at: String!
    pod_date_time: String
    pod_amount: Float!
    attendee_count: Int!
    "Payments already refunded for this pod."
    refunded_count: Int!
    refunded_total: Float!
    "Successful payments NOT refunded — outstanding attendee money."
    unrefunded_count: Int!
    unrefunded_total: Float!
    venue_id: ID
    venue_name: String
    "The venue's booked slot money for this pod (what the venue loses)."
    venue_amount: Float!
    host_names: [String!]!
    club_id: ID
    currency_symbol: String!
  }

  "KPI tiles for Finance → Cancel & Refunds → Dashboard."
  type PodCancellationStats {
    total_cancelled: Int!
    cancelled_by_host: Int!
    cancelled_by_venue: Int!
    cancelled_by_admin: Int!
    cancelled_by_club_admin: Int!
    total_refund_amount: Float!
    refunded_payment_count: Int!
    currency_symbol: String!
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
    """
    Just the global default host commission % (Finance → Default Deductions).
    Split out of financeSettings because the Onboarding console's Review Host
    dialog seeds its commission field from this number, and financeSettings
    also carries the business GSTIN, invoice branding and payout config that
    onboarding staff have no business reading.
    """
    defaultHostCommissionPct: Float!
    """
    The same, for venues — the Onboarding console's Review Venue dialog seeds
    its commission field from this so a reviewer sees the number settlement
    will actually apply when the venue carries no override of its own.
    """
    defaultVenueCommissionPct: Float!
    """
    The same, for Club Admins — the Onboarding console's Review Club Admin
    dialog seeds its Pay Commission field from this, so a reviewer opens on the
    cut a club admin is actually paid when they carry no override of their own.
    """
    defaultClubAdminCommissionPct: Float!
    """
    The same, for product sales — the Onboarding console's Review Brand dialog
    seeds its commission field from this whenever the brand has no override, so
    the number on screen is the one the product invoice will charge.
    """
    defaultProductCommissionPct: Float!
    paymentReleaseRequests(filter: PaymentReleaseFilterInput): [PaymentReleaseRequest!]!
    paymentReleaseRequestsTable(query: TableQueryInput): PaymentReleaseRequestTablePage!
    # Live preview of the host/venue split for a pod given a venue bill.
    # host_user_id picks which co-host's commission override prices it
    # (default: the primary host) — must match the completion input.
    podSettlementPreview(pod_id: ID!, venue_bill_amount: Float!, host_user_id: ID): PodSettlement!
    # The signed-in host's own completion payouts (Host Share history).
    myHostPayouts: [PaymentReleaseRequest!]!
    # A venue owner's payouts across every venue they own (Venue Earnings).
    myVenuePayouts: [PaymentReleaseRequest!]!
    # Complete financial breakdown for one pod — frozen snapshot once settled,
    # live at current dynamic rates otherwise. Pod host, venue owner, or admin.
    podFinanceBreakdown(pod_id: ID!): PodFinanceBreakdown!
    # Potential-earnings preview for Create-a-Pod, using the signed-in host's
    # effective rates. pod_amount is the GST-inclusive ticket price PER SPOT and
    # no_of_spots the total capacity — the server bills (no_of_spots - 1) because
    # the host's own spot is free. venue_id resolves the venue's commission %;
    # venue_amount is the picked slot's price (Partners portal).
    potentialPodEarnings(
      pod_amount: Float!
      no_of_spots: Int!
      venue_id: ID
      venue_amount: Float
    ): PodEarningsProjection!
    """
    The admin consoles' projection for a pod they are writing. Prices at the
    CHOSEN host's rates (host_user_id — the host picked in the editor) or, with
    none chosen, at the platform's default rates, which is exactly what an Auto
    Pod template is checked against before any host enrols. The venue's money
    is read from the slot itself (venue_slot_id), never typed by the client.
    Admin roles only.
    """
    adminPotentialPodEarnings(
      pod_amount: Float!
      no_of_spots: Int!
      host_user_id: ID
      venue_id: ID
      venue_slot_id: ID
    ): PodEarningsProjection!
    """
    The same projection for a signed-OUT visitor — the marketing site's earnings
    estimator. Runs at the platform's DEFAULT rates (there is no host to
    personalise for) and takes the venue's cost as a plain amount, so it is an
    estimate at standard rates rather than a quote. Public on purpose: it
    exposes the same percentages the pricing page states, and no user data.
    """
    publicPodEarningsEstimate(
      pod_amount: Float!
      no_of_spots: Int!
      venue_amount: Float
    ): PodEarningsProjection!
    """
    Suggested ₹x99 ticket prices for Create-a-Pod Step 4 — the same input
    surface as potentialPodEarnings minus the ticket price. Walks 99, 199, 299…
    and returns the first candidates whose projected host payout is strictly
    positive: up to 5 rows, fewer near the ₹99,999 cap, empty when no candidate
    earns the host anything. A ₹0-or-negative payout is never suggested.
    """
    suggestedTicketPrices(no_of_spots: Int!, venue_id: ID, venue_amount: Float): [SuggestedTicketPrice!]!
    # Host Studio dashboard earnings summary (signed-in host).
    myHostEarningsSummary: EarningsSummary!
    # Host Studio insights charts (signed-in host): status distribution
    # (incl. cancelled/soft-deleted) + monthly payout series (default 12 months).
    hostInsights(months: Int): HostInsights!
    # Venue Earnings dashboard summary (signed-in venue owner).
    myVenueEarningsSummary: EarningsSummary!
    # Finance portal dashboard KPI cards (finance roles only).
    financeDashboardStats: FinanceDashboardStats!
    # Cancel & Refunds: every cancelled pod, newest first (finance roles only).
    podCancellations(kind: PodCancelKind): [PodCancellation!]!
    # Cancel & Refunds dashboard KPI tiles (finance roles only).
    podCancellationStats: PodCancellationStats!
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
