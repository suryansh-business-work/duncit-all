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
    withdrawalRequests(status: WithdrawalStatus): [WalletWithdrawal!]!
    withdrawalRequestsTable(query: TableQueryInput): WalletWithdrawalTablePage!
    withdrawalMinimums: WithdrawalMinimums!
  }

  extend type Mutation {
    requestWithdrawal(input: RequestWithdrawalInput!): WalletWithdrawal!
    reviewWithdrawal(withdrawal_id: ID!, input: ReviewWithdrawalInput!): WalletWithdrawal!
    updateWithdrawalMinimums(input: UpdateWithdrawalMinimumsInput!): WithdrawalMinimums!
  }
`;
