export const expenseTypeDefs = /* GraphQL */ `
  type ExpenseRefund {
    refund_id: String!
    date: String!
    amount: Float!
    note: String!
    created_at: String!
  }

  type Expense {
    id: ID!
    expense_id: String!
    date: String!
    category: String!
    amount: Float!
    refund_total: Float!
    net_amount: Float!
    description: String!
    vendor_name: String!
    payment_method: String!
    reference: String!
    attachment_url: String!
    refunds: [ExpenseRefund!]!
    created_by: ID
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (expensesTable)."
  type ExpenseTablePage {
    rows: [Expense!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type ExpenseCategoryTotal {
    category: String!
    total: Float!
  }

  type ExpenseSummary {
    total: Float!
    gross_total: Float!
    refund_total: Float!
    count: Int!
    by_category: [ExpenseCategoryTotal!]!
  }

  input ExpenseFilterInput {
    from: String
    to: String
    category: String
    payment_method: String
    search: String
    min_amount: Float
    max_amount: Float
  }

  input CreateExpenseInput {
    date: String!
    category: String!
    amount: Float!
    description: String
    vendor_name: String
    payment_method: String
    reference: String
    attachment_url: String
  }

  input AddExpenseRefundInput {
    date: String!
    amount: Float!
    note: String
  }

  extend type Query {
    expenses(filter: ExpenseFilterInput): [Expense!]!
    expensesTable(query: TableQueryInput): ExpenseTablePage!
    expenseSummary(filter: ExpenseFilterInput): ExpenseSummary!
  }

  extend type Mutation {
    createExpense(input: CreateExpenseInput!): Expense!
    updateExpense(expense_doc_id: ID!, input: CreateExpenseInput!): Expense!
    deleteExpense(expense_doc_id: ID!): Boolean!
    addExpenseRefund(expense_doc_id: ID!, input: AddExpenseRefundInput!): Expense!
    removeExpenseRefund(expense_doc_id: ID!, refund_id: String!): Expense!
  }
`;
