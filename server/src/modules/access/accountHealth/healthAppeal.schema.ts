export const healthAppealTypeDefs = /* GraphQL */ `
  "Why the person says a deduction should be lifted."
  enum HealthAppealReason {
    WONT_HAPPEN_AGAIN
    INCORRECT
  }

  "Where the Legal team has taken an appeal."
  enum HealthAppealStatus {
    PENDING
    ACCEPTED
    DENIED
  }

  """
  An appeal against one health deduction, filed from mWeb or the app by the
  person it hit, and decided in Legal > Account Health Appeals.
  """
  type HealthAppeal {
    id: ID!
    "The permanent handle, e.g. APL-000042."
    appeal_no: String!
    adjustment_id: ID!
    subject_type: HealthSubjectType!
    subject_id: ID!
    "The account or venue name when the appeal was filed."
    subject_label: String!
    appellant_name: String!
    "The deduction as it stood when appealed."
    delta: Int!
    remark: String!
    adjusted_at: String!
    reason: HealthAppealReason!
    message: String!
    status: HealthAppealStatus!
    decision_note: String!
    decided_by_name: String!
    decided_at: String
    created_at: String!
  }

  type HealthAppealTablePage {
    rows: [HealthAppeal!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "What filing an appeal answers with — the handle to quote."
  type HealthAppealReceipt {
    id: ID!
    appeal_no: String!
    status: HealthAppealStatus!
  }

  input AppealHealthAdjustmentInput {
    adjustment_id: ID!
    reason: HealthAppealReason!
    message: String!
  }

  extend type Query {
    """ Legal-only: every appeal against a health deduction (DUNCIT TABLE CONTRACT v1). """
    healthAppealsTable(query: TableQueryInput): HealthAppealTablePage!
  }

  extend type Mutation {
    """ Appeal a deduction on your own account or venue. Once per deduction. """
    appealHealthAdjustment(input: AppealHealthAdjustmentInput!): HealthAppealReceipt!
    """ Legal-only: lift the deduction and tell the person (in-app + email). """
    acceptHealthAppeal(id: ID!, note: String): HealthAppeal!
    """ Legal-only: keep the deduction and tell the person (in-app + email). """
    denyHealthAppeal(id: ID!, note: String): HealthAppeal!
  }
`;
