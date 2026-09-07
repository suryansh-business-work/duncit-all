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
    "Receipt / proof of the spend (image or PDF). Empty when none is attached."
    attachment_url: String!
    "Configured RELATED_FROM_TYPE key, or '' when the expense is unattributed."
    related_from_type: String!
    related_from_id: ID
    "The entity's name AS FILED — a snapshot, so a rename never rewrites history."
    related_from_name: String!
    "Who actually paid it out."
    paid_by: String!
    "PENDING | PARTIAL | FULL | REJECTED — derived from the money, not typed."
    compensation_status: String!
    "Configured COMPENSATION_METHOD key, or '' until somebody decides."
    compensation_method: String!
    compensated_amount: Float!
    "amount - compensated_amount, floored at 0."
    pending_compensation: Float!
    compensation_date: String
    compensation_reference: String!
    refunds: [ExpenseRefund!]!
    created_by: ID
    updated_by: ID
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
    related_from_type: String
    related_from_id: ID
    compensation_status: String
    compensation_method: String
    paid_by: String
    search: String
    min_amount: Float
    max_amount: Float
  }

  "One bar of a dashboard breakdown. An empty key is 'not attributed'."
  type ExpenseBreakdownSlice {
    key: String!
    total: Float!
    count: Int!
  }

  """
  Everything Finance > Expenses > Dashboard renders, from one matched set.

  Keys in the breakdowns are the STORED option keys; the labels come from
  expenseOptions, which the page already reads for its filters.
  """
  type ExpenseDashboard {
    total_expenses: Float!
    expense_count: Int!
    pending_count: Int!
    partial_count: Int!
    full_count: Int!
    rejected_count: Int!
    pending_total: Float!
    partial_total: Float!
    full_total: Float!
    rejected_total: Float!
    total_compensation_amount: Float!
    "Still owed on everything not rejected."
    pending_compensation_amount: Float!
    "Calendar month totals, deliberately ignoring the page's date filter."
    current_month_total: Float!
    previous_month_total: Float!
    by_category: [ExpenseBreakdownSlice!]!
    by_related_type: [ExpenseBreakdownSlice!]!
    by_compensation_method: [ExpenseBreakdownSlice!]!
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
    "A configured RELATED_FROM_TYPE key; anything else is stored as unattributed."
    related_from_type: String
    "The entity's document id. Its NAME is read server-side, never trusted from here."
    related_from_id: ID
    paid_by: String
    compensation_method: String
    compensated_amount: Float
    compensation_date: String
    compensation_reference: String
    "The one part of the status a person states; the rest follows the amount."
    compensation_rejected: Boolean
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
    "KPI tiles + the three breakdowns for the Expense Dashboard."
    expenseDashboard(filter: ExpenseFilterInput): ExpenseDashboard!
  }

  extend type Mutation {
    createExpense(input: CreateExpenseInput!): Expense!
    updateExpense(expense_doc_id: ID!, input: CreateExpenseInput!): Expense!
    deleteExpense(expense_doc_id: ID!): Boolean!
    addExpenseRefund(expense_doc_id: ID!, input: AddExpenseRefundInput!): Expense!
    removeExpenseRefund(expense_doc_id: ID!, refund_id: String!): Expense!
  }
`;
