export const podExpenseTypeDefs = /* GraphQL */ `
  """
  Where a pod sits in its own lifecycle, for the Pod Expenses list. CANCELLED
  pods appear here even though every other pod read hides them — money already
  spent on a called-off pod is still Duncit's cost.
  """
  enum PodExpensePodStatus {
    UPCOMING
    ONGOING
    COMPLETED
    CANCELLED
  }

  "One pod, with everything Duncit has spent on it rolled up."
  type PodExpensePodRow {
    pod_doc_id: ID!
    "The pod's human slug (pod_id), not the document id."
    pod_code: String!
    pod_title: String!
    pod_date_time: String!
    pod_mode: String!
    pod_status: PodExpensePodStatus!
    ticket_price: Float!
    no_of_spots: Int!
    expense_total: Float!
    expense_count: Int!
    "How many of those entries have a bill or invoice attached."
    bill_count: Int!
    last_expense_at: String
  }

  "Server-side table page for the shared table engine (podExpensePodsTable)."
  type PodExpensePodTablePage {
    rows: [PodExpensePodRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "One thing Duncit paid for to put a pod on."
  type PodExpense {
    id: ID!
    expense_id: String!
    pod_id: ID!
    date: String!
    category: String!
    amount: Float!
    description: String!
    vendor_name: String!
    payment_method: String!
    reference: String!
    "The supplier's bill / invoice number, as printed on the document."
    bill_number: String!
    "The uploaded bill or invoice (image or PDF). Empty when none is attached."
    bill_url: String!
    created_by: ID
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (podExpensesTable)."
  type PodExpenseTablePage {
    rows: [PodExpense!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type PodExpenseCategoryTotal {
    category: String!
    total: Float!
  }

  type PodExpenseSummary {
    total_spent: Float!
    this_month_spent: Float!
    expense_count: Int!
    "Distinct pods that have at least one expense recorded."
    pods_covered: Int!
    bill_count: Int!
    missing_bill_count: Int!
    by_category: [PodExpenseCategoryTotal!]!
  }

  input PodExpenseInput {
    date: String!
    category: String!
    amount: Float!
    description: String
    vendor_name: String
    payment_method: String
    reference: String
    bill_number: String
    bill_url: String
  }

  extend type Query {
    "Pod Expenses list: one row per pod, with its Duncit spend rolled up."
    podExpensePodsTable(query: TableQueryInput): PodExpensePodTablePage!
    "The same row for one pod — the expense drawer's header."
    podExpensePodSummary(pod_doc_id: ID!): PodExpensePodRow
    "One pod's expense entries."
    podExpensesTable(pod_doc_id: ID!, query: TableQueryInput): PodExpenseTablePage!
    "KPI tiles + per-category split for the Pod Expenses page."
    podExpenseSummary: PodExpenseSummary!
  }

  extend type Mutation {
    createPodExpense(pod_doc_id: ID!, input: PodExpenseInput!): PodExpense!
    updatePodExpense(expense_doc_id: ID!, input: PodExpenseInput!): PodExpense!
    deletePodExpense(expense_doc_id: ID!): Boolean!
  }
`;
