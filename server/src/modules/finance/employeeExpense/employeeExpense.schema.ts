export const employeeExpenseTypeDefs = /* GraphQL */ `
  """
  One out-of-pocket spend an employee is claiming back. The employee files it
  from the Employee console; Finance decides on it from Finance > Employee
  Expenses. The employee name and email are joined on for the Finance list —
  the employee's own list already knows whose claims it is showing.
  """
  type EmployeeExpense {
    id: ID!
    "Human-readable claim reference, e.g. DUN-EXP-4F2A19."
    claim_id: String!
    employee_id: ID!
    employee_name: String!
    employee_email: String!
    date: String!
    category: String!
    amount: Float!
    description: String!
    "Who was paid — the shop, airline or vendor on the receipt."
    merchant: String!
    payment_method: String!
    reference: String!
    "The supplier's bill / invoice number, as printed on the document."
    bill_number: String!
    "The uploaded bill or receipt (image or PDF). Empty when none is attached."
    bill_url: String!
    status: String!
    reviewed_by: ID
    reviewed_at: String
    "Finance's note on the decision — the reason a rejection gives back."
    review_note: String!
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine."
  type EmployeeExpenseTablePage {
    rows: [EmployeeExpense!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  """
  The tiles above either list. On the employee's own page the numbers are
  their claims; on the Finance page they are every employee's.
  """
  type EmployeeExpenseSummary {
    claimed_total: Float!
    pending_total: Float!
    approved_total: Float!
    rejected_total: Float!
    pending_count: Int!
    approved_count: Int!
    rejected_count: Int!
    claim_count: Int!
    "Distinct employees with at least one claim. Always 1 on the employee's own page."
    employee_count: Int!
  }

  input EmployeeExpenseInput {
    date: String!
    category: String!
    amount: Float!
    description: String
    merchant: String
    payment_method: String
    reference: String
    bill_number: String
    bill_url: String
  }

  extend type Query {
    "The signed-in employee's own claims."
    myEmployeeExpensesTable(query: TableQueryInput): EmployeeExpenseTablePage!
    """
    One of the signed-in employee's own claims, so the claim page can open from
    its own URL rather than only from the row that was clicked.
    """
    myEmployeeExpense(expense_doc_id: ID!): EmployeeExpense!
    "Tiles for the signed-in employee's own claims."
    myEmployeeExpenseSummary: EmployeeExpenseSummary!
    "Finance: every employee's claims, with the employee joined on."
    employeeExpensesTable(query: TableQueryInput): EmployeeExpenseTablePage!
    "Finance: tiles across every employee's claims."
    employeeExpenseSummary: EmployeeExpenseSummary!
  }

  extend type Mutation {
    "File a new claim. It starts PENDING and is worth nothing until Finance decides."
    createEmployeeExpense(input: EmployeeExpenseInput!): EmployeeExpense!
    "Edit one of your own claims. Only while it is still PENDING."
    updateEmployeeExpense(expense_doc_id: ID!, input: EmployeeExpenseInput!): EmployeeExpense!
    "Withdraw one of your own claims. Only while it is still PENDING."
    deleteEmployeeExpense(expense_doc_id: ID!): Boolean!
    "Finance's decision — APPROVED or REJECTED; a rejection owes the employee a note."
    reviewEmployeeExpense(
      expense_doc_id: ID!
      decision: String!
      note: String
    ): EmployeeExpense!
  }
`;
