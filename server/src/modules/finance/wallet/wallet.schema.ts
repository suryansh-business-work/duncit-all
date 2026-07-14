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

  type Wallet {
    balance: Float!
    currency_symbol: String!
    payout_mode: PayoutMode!
    next_payout_at: String!
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
  }

  extend type Mutation {
    requestWithdrawal(input: RequestWithdrawalInput!): WalletWithdrawal!
    reviewWithdrawal(withdrawal_id: ID!, input: ReviewWithdrawalInput!): WalletWithdrawal!
  }
`;
