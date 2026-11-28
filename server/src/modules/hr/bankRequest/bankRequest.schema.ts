/**
 * Salary bank-account changes. The HR console's half (deciding) is filed under
 * the MCP `hr` category; the Employee console's half (asking) under `employee`.
 */
export const hrBankRequestTypeDefs = /* GraphQL */ `
  enum HrBankRequestStatus {
    PENDING
    APPROVED
    REJECTED
    CANCELLED
  }

  enum HrBankProofKind {
    IMAGE
    PDF
  }

  "A change of salary account an employee asked for. The account number is masked to its last four."
  type HrBankChangeRequest {
    id: ID!
    employee_id: ID!
    employee_name: String!
    employee_code: String!
    account_holder_name: String!
    account_number_masked: String!
    ifsc: String!
    bank_name: String
    proof_kind: HrBankProofKind!
    "The employee's own note."
    note: String
    status: HrBankRequestStatus!
    decided_by: String
    decided_at: String
    decision_note: String
    created_at: String
  }

  type HrBankChangeRequestTablePage {
    rows: [HrBankChangeRequest!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "What HR checks before deciding. Opening it is recorded on the request."
  type HrBankChangeRequestDetail {
    request: HrBankChangeRequest!
    "The full new account number, to compare with the proof."
    account_number: String!
    "A short-lived link to the private proof document."
    proof_url: String!
    proof_expires_at: String!
    "The account on the HR record today."
    current: HrBankSummary
  }

  extend type Query {
    "HR console: salary account changes employees asked for (DUNCIT TABLE CONTRACT v1)."
    hrBankChangeRequestsTable(query: TableQueryInput): HrBankChangeRequestTablePage!
    "HR console: one change with the full account number and the proof. Every call is recorded."
    hrBankChangeRequest(id: ID!): HrBankChangeRequestDetail!
  }

  extend type Mutation {
    "HR console: approve a change (it becomes the salary account on the HR record) or decline it with a reason. Never your own."
    decideHrBankChangeRequest(id: ID!, approve: Boolean!, note: String): HrBankChangeRequest!
  }
`;

export const myBankRequestTypeDefs = /* GraphQL */ `
  type MyBankAccount {
    "The salary account on your HR record."
    current: HrBankSummary!
    "Your change still waiting for HR."
    pending: HrBankChangeRequest
    "Your last ten changes, newest first."
    history: [HrBankChangeRequest!]!
    "False while a change waits, or once your employment has ended."
    can_request: Boolean!
  }

  input BankChangeRequestInput {
    account_holder_name: String!
    "6 to 18 digits."
    account_number: String!
    "11 characters, for example HDFC0001234."
    ifsc: String!
    bank_name: String
    "The upload hook's URL for folder hr-bank-proof: a cancelled cheque or the passbook's first page, image or PDF."
    proof_url: String!
    note: String
    "One id per press of Send; a repeated press returns the request the first one made."
    client_request_id: String
  }

  extend type Query {
    "Employee console: your salary account and any change waiting for HR. Null until HR has added you."
    myBankAccount: MyBankAccount
  }

  extend type Mutation {
    "Employee console: ask HR to pay your salary into a different account. Nothing changes until HR approves it."
    requestMyBankChange(input: BankChangeRequestInput!): HrBankChangeRequest!
    "Employee console: withdraw a change that is still waiting."
    cancelMyBankChange(id: ID!): HrBankChangeRequest!
  }
`;
