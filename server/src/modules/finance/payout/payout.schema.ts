export const payoutTypeDefs = /* GraphQL */ `
  "A Finance decision on a withdrawal. Separate from the payout: an approved withdrawal can still fail to pay."
  enum ApprovalStatus {
    PENDING
    APPROVED
    PARTIALLY_APPROVED
    REJECTED
  }

  "What the bank says about one payout, as Razorpay reports it."
  enum PayoutStatus {
    PROCESSING
    PAID
    FAILED
  }

  "The single status Finance tables show: the decision until a payout starts, then the payout's own state."
  enum MoneyOutStatus {
    PENDING
    APPROVED
    PARTIALLY_APPROVED
    REJECTED
    PROCESSING
    PAID
    FAILED
  }

  enum WithdrawalDecision {
    APPROVE
    PARTIAL
    REJECT
  }

  enum SendMoneyCategory {
    SALARY
    REFUND
    REIMBURSEMENT
    ADJUSTMENT
    OTHER
  }

  enum PayoutSubject {
    WITHDRAWAL
    SEND_MONEY
  }

  "A bank or UPI account Duncit has verified for a person (it sits on an approved host, venue or brand)."
  type VerifiedBankAccount {
    "Pass this back to pick the account — the destination is never sent from the client."
    id: ID!
    source: String!
    label: String!
    payout_method: WithdrawalMethod!
    account_holder_name: String!
    account_number: String!
    ifsc_code: String!
    upi_id: String!
  }

  "Everything the approval dialog shows for one withdrawal."
  type WithdrawalReview {
    withdrawal: WalletWithdrawal!
    "The verified account the requested destination matches, or null when it is not on a verified record."
    verified_account: VerifiedBankAccount
    account_verified: Boolean!
    "False until the Razorpay keys and the RazorpayX account number are set in the Tech portal."
    payouts_configured: Boolean!
    "The person's wallet balance right now (the requested amount has already left it)."
    wallet_balance: Float!
    currency_symbol: String!
  }

  input DecideWithdrawalInput {
    decision: WithdrawalDecision!
    "Required for PARTIAL: the amount to pay. Less than the request, at least 1."
    approved_amount: Float
    "Required for PARTIAL and REJECT."
    reason: String
    "Finance confirms paying an account that is not on a verified record."
    acknowledge_unverified_account: Boolean
  }

  "One row of the immutable money-out audit trail."
  type PayoutAuditEntry {
    id: ID!
    subject: PayoutSubject!
    subject_id: String!
    action: String!
    user_id: ID!
    user_name: String!
    requested_amount: Float!
    approved_amount: Float
    reason: String!
    actor_id: ID
    actor_name: String!
    actor_role: String!
    payment_status: String!
    razorpay_payout_id: String!
    utr: String!
    created_at: String!
  }

  type PayoutAuditPage {
    rows: [PayoutAuditEntry!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type SendMoneyRecipient {
    id: ID!
    name: String!
    email: String!
    phone: String!
    verified_accounts: [VerifiedBankAccount!]!
  }

  type SendMoneyOptions {
    categories: [SendMoneyCategory!]!
    payouts_configured: Boolean!
    currency_symbol: String!
  }

  type SendMoneyTransfer {
    id: ID!
    transfer_id: String!
    recipient_user_id: ID!
    recipient_name: String!
    recipient_email: String!
    recipient_phone: String!
    amount: Float!
    category: SendMoneyCategory!
    reason: String!
    notes: String!
    supporting_reference: String!
    supporting_url: String!
    payout_method: WithdrawalMethod!
    account_holder_name: String!
    account_number: String!
    ifsc_code: String!
    upi_id: String!
    initiated_by_name: String!
    approved_by_name: String!
    status: MoneyOutStatus!
    payout_status: PayoutStatus!
    razorpay_payout_id: String!
    utr: String!
    failure_reason: String!
    attempt: Int!
    created_at: String!
    completed_at: String
  }

  type SendMoneyTransferPage {
    rows: [SendMoneyTransfer!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input SendMoneyInput {
    "Minted by the form when it opens. A repeat of the same id returns the transfer already made."
    request_id: String!
    recipient_user_id: ID!
    "One of the recipient's verified_accounts."
    account_id: ID!
    "IMPS or NEFT for a bank account. Ignored for UPI."
    payout_method: WithdrawalMethod
    amount: Float!
    category: SendMoneyCategory!
    reason: String!
    notes: String
    supporting_reference: String
    supporting_url: String
  }

  extend type Query {
    "The approval dialog's data for one withdrawal."
    withdrawalReview(withdrawal_id: ID!): WithdrawalReview!
    "The money-out audit trail, newest first. Withdrawal Logs reads kind WITHDRAWAL."
    payoutAuditTable(kind: PayoutSubject!, query: TableQueryInput): PayoutAuditPage!
    "Search people to send money to (name, email or phone)."
    sendMoneyRecipients(search: String!, limit: Int): [SendMoneyRecipient!]!
    "One person's profile details and verified accounts."
    sendMoneyRecipient(user_id: ID!): SendMoneyRecipient!
    sendMoneyOptions: SendMoneyOptions!
    "Send Money Logs: every manual transfer."
    sendMoneyTransfersTable(query: TableQueryInput): SendMoneyTransferPage!
  }

  extend type Mutation {
    "Approve, partially approve or reject a pending withdrawal; an approval pays through Razorpay."
    decideWithdrawal(withdrawal_id: ID!, input: DecideWithdrawalInput!): WalletWithdrawal!
    "Start a failed or stalled payout again (a failed one is a new, deliberate attempt)."
    retryWithdrawalPayout(withdrawal_id: ID!): WalletWithdrawal!
    "Pay a person from the Finance Portal, to one of their verified accounts."
    sendMoney(input: SendMoneyInput!): SendMoneyTransfer!
    retrySendMoneyTransfer(transfer_id: ID!): SendMoneyTransfer!
  }
`;
