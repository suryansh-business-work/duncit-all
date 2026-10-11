export const walletTypeDefs = /* GraphQL */ `
  enum WithdrawalStatus {
    PENDING
    PAID
    REJECTED
  }

  enum WithdrawalMethod {
    UPI
    IMPS
    NEFT
  }

  """
  The capacity a payout was withdrawn in. Stamped on the withdrawal when it is
  requested and never resolved live, so it cannot change with the user's roles.
  """
  enum WithdrawerRole {
    HOST
    VENUE_OWNER
    ECOMM_MANAGER
    CLUB_ADMIN
  }

  type Wallet {
    balance: Float!
    currency_symbol: String!
    payout_mode: PayoutMode!
    next_payout_at: String!
    "Which of the four capacities this wallet withdraws in (precedence: VENUE_OWNER, CLUB_ADMIN, ECOMM_MANAGER, HOST)."
    withdrawer_role: WithdrawerRole!
    "Role-wise minimum withdrawal amount that applies to this wallet."
    min_withdrawal_amount: Float!
    "balance >= min_withdrawal_amount, decided server-side — clients must not re-derive it."
    can_withdraw: Boolean!
  }

  "Role-wise minimum withdrawal amounts (Finance → Withdrawals → Withdrawal Settings)."
  type WithdrawalMinimums {
    host: Float!
    venue_owner: Float!
    ecomm_manager: Float!
    club_admin: Float!
  }

  "Every role is optional: the ones sent are updated, the rest keep their stored value."
  input UpdateWithdrawalMinimumsInput {
    host: Float
    venue_owner: Float
    ecomm_manager: Float
    club_admin: Float
  }

  type WalletTransaction {
    id: ID!
    type: String!
    amount: Float!
    balance_after: Float!
    source: String!
    reason: String!
    pod_id: ID
    created_at: String!
  }

  """
  Which pod's earnings funded a slice of a withdrawal.

  Decided once, when the withdrawal is requested, by drawing the withdrawer's
  un-withdrawn pod credits oldest first. It is an accounting attribution, not a
  physical fact — a wallet holds one fungible balance — so Finance reads it as
  "where this money came from", never as a separate payable.
  """
  type WithdrawalAllocation {
    pod_id: ID!
    "Frozen at request time, so a soft-deleted pod still renders a title."
    pod_title: String!
    release_id: String!
    kind: PaymentReleaseKind!
    "The capacity THIS pod's money was earned in, derived from the payout leg."
    role: WithdrawerRole!
    amount: Float!
  }

  "One pod somebody has withdrawn against — a row of the Withdrawal Payments list."
  type PodWithdrawalGroup {
    pod_id: ID!
    pod_title: String!
    "Every partner who has raised a withdrawal against this pod so far."
    requested_from: [WithdrawerRole!]!
    "APPROVED only when every request against this pod has been paid."
    status: PodWithdrawalStatus!
    "Sum of the slices attributed to this pod across those requests."
    attributed_total: Float!
    withdrawal_count: Int!
    last_requested_at: String!
  }

  enum PodWithdrawalStatus {
    PENDING
    APPROVED
  }

  type PodWithdrawalGroupPage {
    rows: [PodWithdrawalGroup!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type WalletWithdrawal {
    id: ID!
    withdrawal_id: String!
    user_id: ID!
    beneficiary_name: String!
    beneficiary_email: String!
    amount: Float!
    withdrawer_role: WithdrawerRole!
    status: WithdrawalStatus!
    payout_method: WithdrawalMethod!
    account_holder_name: String!
    account_number: String!
    ifsc_code: String!
    upi_id: String!
    scheduled_for: String!
    reject_reason: String!
    requested_at: String!
    "Empty on a rejected request — the money went back, so the pods are free again."
    allocations: [WithdrawalAllocation!]!
    reviewed_at: String
    paid_at: String
    created_at: String!
  }

  "Server-side table page for the shared table engine (withdrawalRequestsTable)."
  type WalletWithdrawalTablePage {
    rows: [WalletWithdrawal!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  enum WalletStatementFormat {
    PDF
    CSV
  }

  "Where a withdrawal's debit stands today, or what a credit was: CREDITED (an earning), REVERSED (a rejected withdrawal handed back), else the withdrawal's own status."
  enum WalletStatementRowStatus {
    CREDITED
    REVERSED
    PENDING
    PAID
    REJECTED
  }

  """
  A statement period as two calendar days, both inclusive, written yyyy-MM-dd
  and read in the app time zone (Admin > Settings) — never the device's. The
  server refuses a period that is back to front, reaches into the future, or
  covers more than 366 days (one financial year).
  """
  input WalletStatementInput {
    from: String!
    to: String!
  }

  "One wallet ledger entry. Exactly one of debit / credit is non-zero."
  type WalletStatementRow {
    id: ID!
    occurred_at: String!
    "POD_COMPLETION, WITHDRAWAL or WITHDRAWAL_REVERSAL — the ledger's own source."
    kind: String!
    "The withdrawal id, else the payout release id, else the entry's own id."
    reference: String!
    description: String!
    debit: Float!
    credit: Float!
    "Balance after this entry. Null when the statement could not be reconciled."
    balance: Float
    status: WalletStatementRowStatus!
  }

  type WalletStatementTotals {
    transaction_count: Int!
    total_credits: Float!
    total_debits: Float!
    earnings_credited: Float!
    "Every withdrawal requested in the period; the three below split it by where each stands today."
    withdrawals_requested: Float!
    withdrawals_paid: Float!
    withdrawals_pending: Float!
    withdrawals_rejected: Float!
    "Rejected withdrawals whose amount came back to the wallet in the period."
    reversals_credited: Float!
  }

  """
  The signed-in user's wallet account statement for a period.

  opening_balance + total_credits - total_debits = closing_balance, always. When
  the stored ledger does not agree with that sum, balances_reconciled is false
  and every balance is null rather than a number that does not add up.
  """
  type WalletStatement {
    account_name: String!
    account_email: String!
    currency_symbol: String!
    time_zone: String!
    period_from: String!
    period_to: String!
    generated_at: String!
    balances_reconciled: Boolean!
    opening_balance: Float
    closing_balance: Float
    rows: [WalletStatementRow!]!
    totals: WalletStatementTotals!
  }

  "The statement as a file to save under this name."
  type WalletStatementFile {
    filename: String!
    mime: String!
    content_base64: String!
    "0 for a nil statement — a period with no transactions still downloads."
    transaction_count: Int!
  }

  input RequestWithdrawalInput {
    amount: Float!
    payout_method: WithdrawalMethod!
    account_holder_name: String
    account_number: String
    ifsc_code: String
    upi_id: String
  }

  input ReviewWithdrawalInput {
    status: WithdrawalStatus!
    reason: String
  }

  extend type Query {
    myWallet: Wallet!
    myWalletTransactions: [WalletTransaction!]!
    myWithdrawals: [WalletWithdrawal!]!
    "The caller's own wallet statement. There is no user argument: nobody can ask for another account's."
    myWalletStatement(input: WalletStatementInput!): WalletStatement!
    "The same statement as a PDF or CSV file, base64-encoded."
    myWalletStatementFile(input: WalletStatementInput!, format: WalletStatementFormat!): WalletStatementFile!
    withdrawalRequests(status: WithdrawalStatus): [WalletWithdrawal!]!
    withdrawalRequestsTable(query: TableQueryInput): WalletWithdrawalTablePage!
    """
    Withdrawal Payments, grouped by pod.

    A requested_from filter in the query narrows to pods that partner has
    withdrawn against. It is applied to the allocations BEFORE grouping, so a
    pod's totals only ever count that partner's legs — matching it against the
    grouped row would keep pods whose other partners matched.
    """
    podWithdrawalGroupsTable(query: TableQueryInput): PodWithdrawalGroupPage!
    "One pod's row from that list. Null when nothing has been withdrawn against it."
    podWithdrawalSummary(pod_id: ID!): PodWithdrawalGroup
    "Every withdrawal attributed to one pod — the Withdrawal Payments drill-down."
    podWithdrawalsTable(pod_id: ID!, query: TableQueryInput): WalletWithdrawalTablePage!
    withdrawalMinimums: WithdrawalMinimums!
  }

  extend type Mutation {
    requestWithdrawal(input: RequestWithdrawalInput!): WalletWithdrawal!
    reviewWithdrawal(withdrawal_id: ID!, input: ReviewWithdrawalInput!): WalletWithdrawal!
    updateWithdrawalMinimums(input: UpdateWithdrawalMinimumsInput!): WithdrawalMinimums!
  }
`;
