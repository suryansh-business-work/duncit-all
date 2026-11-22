/**
 * Failed payments: a buyer's Razorpay checkout that did not end in a booking,
 * the evidence they send when money left their account anyway, and Finance's
 * review and refund of it. One case per payment; every step is also written to
 * the payment's event timeline.
 */
export const failedPaymentTypeDefs = /* GraphQL */ `
  enum PaymentFailureKind {
    CANCELLED
    TIMEOUT
    FAILED
  }

  enum PaymentEvidenceType {
    SCREENSHOT
    BANK_STATEMENT
    TRANSACTION_ID
  }

  "What the AI + Razorpay check concluded about a claim."
  enum FailedPaymentVerificationStatus {
    "No claim yet, or the check is still running."
    PENDING
    "Razorpay captured this payment, the amount matches and no booking used it — refundable straight away."
    MATCHED
    "The evidence could not be matched automatically (or is a PDF) — Finance reviews it."
    UNMATCHED
    "Razorpay never captured the money, so it cannot be refunded through Razorpay (the bank reverses it)."
    NOT_CAPTURED
    "The check itself failed (Razorpay unreachable); re-run it."
    ERROR
  }

  enum FailedPaymentReviewDecision {
    APPROVED
    REJECTED
  }

  enum FailedPaymentResolutionState {
    OPEN
    REFUNDED
    NOT_REFUNDABLE
    REJECTED
    BOOKED
  }

  "NONE means no refund was ever started."
  enum FailedPaymentRefundStatus {
    NONE
    PENDING
    PROCESSED
    FAILED
  }

  "Row colour hint for the Failed Payments table."
  enum FailedPaymentHighlight {
    GREEN
    YELLOW
    NONE
  }

  enum PaymentEventSource {
    CLIENT
    SERVER
    WEBHOOK
    FINANCE
    SYSTEM
  }

  input ReportPaymentFailureInput {
    "Payment.id returned by createRazorpayOrder (payment_doc_id)."
    payment_doc_id: ID!
    kind: PaymentFailureKind!
    razorpay_payment_id: String
    razorpay_order_id: String
    error_code: String
    error_description: String
    error_reason: String
    error_source: String
    error_step: String
    "Whether the failure dialog offered Retry."
    retry_shown: Boolean!
    "1-based count of failures for this checkout session on the device."
    attempt_number: Int!
    "Idempotency key — one per report."
    client_request_id: String!
  }

  type PaymentFailureReceipt {
    case_id: ID!
    razorpay_payment_id: String
  }

  input SubmitPaymentDeductionClaimInput {
    payment_doc_id: ID!
    evidence_type: PaymentEvidenceType!
    "Values the upload hooks returned for folder payment-evidence (1-5). Required for SCREENSHOT and BANK_STATEMENT."
    file_refs: [String!]
    "Required for TRANSACTION_ID."
    transaction_id: String
    client_request_id: String!
  }

  type PaymentDeductionClaimResult {
    case_id: ID!
    "Support ticket number shown to the user, e.g. ST-A1B2C3."
    ticket_no: String!
    "True when an open claim for this payment already existed (the same ticket is returned)."
    already_open: Boolean!
  }

  type FailedPaymentRow {
    id: ID!
    payment_doc_id: ID!
    payment_id: String!
    user_id: ID
    user_name: String!
    user_email: String
    user_phone: String
    pod_id: ID
    pod_title: String!
    "Rupees the checkout asked for."
    amount: Float!
    currency_symbol: String!
    razorpay_payment_id: String
    razorpay_order_id: String
    error_code: String
    error_description: String
    attempts: Int!
    sources: [String!]!
    claim_count: Int!
    ticket_id: ID
    ticket_no: String
    verification_status: FailedPaymentVerificationStatus!
    review_decision: FailedPaymentReviewDecision
    refund_status: FailedPaymentRefundStatus!
    "Rupees sent back, once a refund was started."
    refund_amount: Float
    "The Razorpay refund id (rfnd_…) of this case's refund, as the Razorpay dashboard shows it. Null until one was sent."
    razorpay_refund_id: String
    resolution_state: FailedPaymentResolutionState!
    highlight: FailedPaymentHighlight!
    "Refundable now (green, or yellow after approval). Only FINANCE_MANAGER / SUPER_ADMIN may act on it."
    can_refund: Boolean!
    "Yellow: evidence waits for a person's Review."
    needs_review: Boolean!
    "Razorpay never captured it; Finance can close it as a bank reversal."
    can_mark_not_refundable: Boolean!
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (failedPaymentsTable)."
  type FailedPaymentTablePage {
    rows: [FailedPaymentRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type FailedPaymentError {
    code: String
    description: String
    reason: String
    source: String
    step: String
    "Where the error was learned: CLIENT, WEBHOOK, SERVER."
    reported_by: String
    at: String
  }

  type FailedPaymentEvidenceFile {
    "Opaque reference — pass to failedPaymentEvidenceLink to open it."
    file_ref: String!
    mime: String!
    "IMAGE, PDF or OTHER."
    kind: String!
  }

  type FailedPaymentClaim {
    evidence_type: PaymentEvidenceType!
    transaction_id: String
    files: [FailedPaymentEvidenceFile!]!
    submitted_at: String!
  }

  type FailedPaymentExtracted {
    payment_id: String
    utr: String
    amount: Float
    date: String
    status: String
    payee: String
  }

  type FailedPaymentVerification {
    status: FailedPaymentVerificationStatus!
    "0-1; 1 for an entered transaction id."
    confidence: Float
    extracted: FailedPaymentExtracted
    matched_fields: [String!]!
    matched_payment_id: String
    razorpay_status: String
    "Paise as Razorpay reports it."
    razorpay_amount_paise: Int
    checked_at: String
    notes: String
  }

  type FailedPaymentReview {
    decision: FailedPaymentReviewDecision!
    note: String!
    by_name: String
    at: String!
  }

  type FailedPaymentRefund {
    status: FailedPaymentRefundStatus!
    razorpay_refund_id: String
    razorpay_payment_id: String
    "Rupees."
    amount: Float
    attempted_at: String
    refunded_at: String
    error: String
    initiated_by_name: String
  }

  type FailedPaymentResolution {
    state: FailedPaymentResolutionState!
    at: String
    by_name: String
    note: String
  }

  type FailedPaymentBooking {
    "A booking (seat/membership) was written for this payment."
    exists: Boolean!
    booked_razorpay_payment_id: String
    payment_status: String!
    finalize_state: String!
    needs_refund: Boolean!
    paid_at: String
  }

  type FailedPaymentUser {
    id: ID
    name: String!
    email: String
    phone: String
  }

  type FailedPaymentTicket {
    id: ID!
    ticket_no: String!
    status: String!
  }

  type FailedPaymentDetail {
    id: ID!
    payment_doc_id: ID!
    payment_id: String!
    amount: Float!
    currency_symbol: String!
    pod_id: ID
    pod_title: String!
    razorpay_payment_id: String
    razorpay_order_id: String
    user: FailedPaymentUser!
    booking: FailedPaymentBooking!
    latest_error: FailedPaymentError
    retry_shown: Boolean!
    attempts: Int!
    sources: [String!]!
    claims: [FailedPaymentClaim!]!
    verification: FailedPaymentVerification!
    review: FailedPaymentReview
    refund: FailedPaymentRefund!
    ticket: FailedPaymentTicket
    resolution: FailedPaymentResolution!
    highlight: FailedPaymentHighlight!
    can_refund: Boolean!
    needs_review: Boolean!
    can_mark_not_refundable: Boolean!
    "Rupees a refund would send right now (captured − already refunded), when known."
    refundable_amount: Float
    revision: Int!
    created_at: String!
    updated_at: String!
  }

  type PaymentEventDetail {
    key: String!
    value: String!
  }

  type PaymentEvent {
    id: ID!
    type: String!
    source: PaymentEventSource!
    actor_name: String
    details: [PaymentEventDetail!]!
    created_at: String!
  }

  type FailedPaymentEvidenceLink {
    "Short-lived signed URL; do not store it."
    url: String!
    expires_at: String!
    kind: String!
  }

  extend type Query {
    "Finance › Failed Payments (DUNCIT TABLE CONTRACT v1)."
    failedPaymentsTable(query: TableQueryInput): FailedPaymentTablePage!
    "One failed-payment case with booking, user, Razorpay error, evidence, verification, review, refund and ticket."
    failedPayment(id: ID!): FailedPaymentDetail
    "The payment's event timeline (oldest first)."
    failedPaymentEvents(case_id: ID!): [PaymentEvent!]!
    "Short-lived signed link to one private evidence file. Finance and Support only."
    failedPaymentEvidenceLink(case_id: ID!, file_ref: String!): FailedPaymentEvidenceLink!
  }

  extend type Mutation {
    "Signed-in user records a Razorpay checkout failure on their own payment (idempotent per client_request_id)."
    reportPaymentFailure(input: ReportPaymentFailureInput!): PaymentFailureReceipt!
    "Signed-in user says money was deducted but the booking did not complete; opens a PAYMENT support ticket linked to the payment."
    submitPaymentDeductionClaim(input: SubmitPaymentDeductionClaimInput!): PaymentDeductionClaimResult!
    "Re-run the AI + Razorpay check on a case's latest evidence."
    reverifyFailedPayment(case_id: ID!): FailedPaymentDetail!
    "Approve (makes a yellow case refundable) or reject (closes the case and the ticket with the note)."
    reviewFailedPayment(
      case_id: ID!
      decision: FailedPaymentReviewDecision!
      note: String!
      client_request_id: String
    ): FailedPaymentDetail!
    "Refund the captured amount not yet refunded through Razorpay, at most once. FINANCE_MANAGER / SUPER_ADMIN."
    initiateFailedPaymentRefund(case_id: ID!, client_request_id: String!): FailedPaymentDetail!
    "Close a NOT_CAPTURED case as a bank reversal and resolve its ticket with that explanation."
    markFailedPaymentNotRefundable(case_id: ID!, note: String!, client_request_id: String): FailedPaymentDetail!
  }
`;
