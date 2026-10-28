import gql from 'graphql-tag';

export const manualTestTypeDefs = gql`
  "What a board column means, whatever it is called. Drives the dashboard numbers and the chip tone."
  enum ManualTestCategory {
    TODO
    IN_PROGRESS
    IN_REVIEW
    PASSED
    FAILED
    BLOCKED
  }

  enum ManualTestCaseType {
    TEST_CASE
    BUG
    REGRESSION
    EXPLORATORY
    TASK
  }

  enum ManualTestPriority {
    LOWEST
    LOW
    MEDIUM
    HIGH
    HIGHEST
  }

  enum ManualTestEnvironment {
    STAGING
    PRODUCTION
  }

  "A staff account as a case names it."
  type ManualTestPerson {
    id: ID!
    name: String!
    "Empty when the account has no photo."
    photo: String!
  }

  "A column of the manual test board (Tests > Manual Testing)."
  type ManualTestColumn {
    id: ID!
    name: String!
    "Left-to-right position."
    order: Int!
    category: ManualTestCategory!
    "Cards the column should hold at most; null for no limit. Exceeding it is a warning, never refused."
    wip_limit: Int
    "Every case in the column, whatever the filter (the WIP limit is judged on it). Filled by manualTestColumns and manualTestBoard; null elsewhere."
    case_count: Int
  }

  "A console or app a case can be about, from the platform surface registry."
  type ManualTestSurface {
    key: String!
    name: String!
    "PORTAL, APP or WEBSITE."
    kind: String!
  }

  "One step of a case: what the tester does, and what should happen."
  type ManualTestStep {
    action: String!
    "Empty when the step states no outcome."
    expected: String!
  }

  "An E2E flow or sub flow a case is linked to."
  type ManualTestLinkedFlow {
    id: ID!
    name: String!
  }

  """
  A case as the board and the Cases table show it — never the rich-text
  sections. The full case is ManualTestCase.
  """
  type ManualTestCard {
    id: ID!
    "QA-<n>; never changes."
    key: String!
    title: String!
    type: ManualTestCaseType!
    priority: ManualTestPriority!
    column_id: ID!
    "The case's column. Filled by manualTestCasesTable; null on the board, which groups by column."
    column: ManualTestColumn
    "Fractional position inside the column; the board sorts on it as text."
    rank: String!
    assignee: ManualTestPerson
    labels: [String!]!
    "A ManualTestSurface key; empty when not set."
    surface: String!
    environment: ManualTestEnvironment!
    "Calendar day, yyyy-MM-dd."
    due_date: String
    created_at: String
    "Send it back as expected_updated_at to have a stale write refused."
    updated_at: String
  }

  "A whole manual test case (Tests > Manual Testing > Cases > QA-12)."
  type ManualTestCase {
    id: ID!
    key: String!
    number: Int!
    title: String!
    type: ManualTestCaseType!
    priority: ManualTestPriority!
    column_id: ID!
    column: ManualTestColumn
    rank: String!
    assignee_id: ID
    assignee: ManualTestPerson
    reporter_id: ID
    reporter: ManualTestPerson
    labels: [String!]!
    surface: String!
    environment: ManualTestEnvironment!
    "Rich-text HTML from the portal editor; empty when not written."
    description: String!
    preconditions: String!
    expected_result: String!
    actual_result: String!
    steps: [ManualTestStep!]!
    e2e_flow: ManualTestLinkedFlow
    e2e_sub_flow: ManualTestLinkedFlow
    due_date: String
    estimate_minutes: Int
    "When the case last landed in a PASSED or FAILED column."
    executed_at: String
    created_at: String
    updated_at: String
  }

  type ManualTestBoardColumn {
    column: ManualTestColumn!
    "The first page of the column's cards matching the filter, in rank order."
    cases: [ManualTestCard!]!
    "How many cards in the column match the filter in all."
    total: Int!
  }

  type ManualTestBoard {
    columns: [ManualTestBoardColumn!]!
  }

  type ManualTestColumnCasesPage {
    cases: [ManualTestCard!]!
    total: Int!
  }

  type ManualTestCasesTablePage {
    rows: [ManualTestCard!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type ManualTestComment {
    id: ID!
    case_id: ID!
    author: ManualTestPerson
    "Rich-text HTML."
    body: String!
    "Null for a comment never edited."
    edited_at: String
    created_at: String
    "The caller wrote it."
    can_edit: Boolean!
    "The caller wrote it, or is a super admin."
    can_delete: Boolean!
  }

  type ManualTestCommentPage {
    "Oldest first."
    rows: [ManualTestComment!]!
    total: Int!
  }

  "One change to a case, from the platform's table change log."
  type ManualTestActivity {
    id: ID!
    "CREATE or UPDATE."
    action: String!
    "The changed field (title, column_id, assignee_id, …); empty on CREATE."
    field: String!
    "Ids are shown as names; long rich-text values are left empty (the entry says only that they changed)."
    old_value: String!
    new_value: String!
    actor: ManualTestPerson!
    created_at: String
  }

  type ManualTestActivityPage {
    "Newest first."
    rows: [ManualTestActivity!]!
    total: Int!
  }

  input ManualTestBoardFilter {
    "Matches the key or the title."
    search: String
    assignee_id: ID
    type: ManualTestCaseType
    priority: ManualTestPriority
    "One exact label."
    label: String
    "A ManualTestSurface key."
    surface: String
    environment: ManualTestEnvironment
  }

  input ManualTestColumnInput {
    name: String!
    category: ManualTestCategory!
    wip_limit: Int
  }

  input ManualTestStepInput {
    action: String!
    expected: String
  }

  """
  A case's fields. On create only the title is required (the column defaults
  to the board's first). On update a field left out is unchanged and null
  clears it.
  """
  input ManualTestCaseInput {
    title: String
    type: ManualTestCaseType
    priority: ManualTestPriority
    column_id: ID
    assignee_id: ID
    reporter_id: ID
    labels: [String!]
    surface: String
    environment: ManualTestEnvironment
    description: String
    preconditions: String
    expected_result: String
    actual_result: String
    steps: [ManualTestStepInput!]
    e2e_flow_id: ID
    e2e_sub_flow_id: ID
    "Calendar day, yyyy-MM-dd."
    due_date: String
    estimate_minutes: Int
  }

  extend type Query {
    "The board: every column with its first page of matching cards. Tests/Super admin only."
    manualTestBoard(filter: ManualTestBoardFilter): ManualTestBoard!
    "The next page of one column (load more), under the same filter."
    manualTestColumnCases(column_id: ID!, filter: ManualTestBoardFilter, offset: Int): ManualTestColumnCasesPage!
    "Every case (Tests > Manual Testing > Cases)."
    manualTestCasesTable(query: TableQueryInput): ManualTestCasesTablePage!
    "One case by its key (QA-12), or null."
    manualTestCase(key: String!): ManualTestCase
    "A case's history, newest first."
    manualTestCaseActivity(id: ID!, offset: Int): ManualTestActivityPage!
    "A case's comment thread, oldest first."
    manualTestComments(case_id: ID!, offset: Int): ManualTestCommentPage!
    "The board's columns left to right, with their case counts."
    manualTestColumns: [ManualTestColumn!]!
    "Active staff who hold TESTS_MANAGER or SUPER_ADMIN — who a case can be assigned to."
    manualTestAssignees: [ManualTestPerson!]!
    "Labels already in use, for autocomplete."
    manualTestLabels(search: String): [String!]!
    "The consoles and apps a case can be about."
    manualTestSurfaces: [ManualTestSurface!]!
  }

  extend type Mutation {
    "Add a column at the right end of the board."
    createManualTestColumn(input: ManualTestColumnInput!): ManualTestColumn!
    updateManualTestColumn(id: ID!, input: ManualTestColumnInput!): ManualTestColumn!
    "Set the board's order; ids must name every column once."
    reorderManualTestColumns(ids: [ID!]!): [ManualTestColumn!]!
    "Delete a column; its cases move to the bottom of target_column_id, atomically."
    deleteManualTestColumn(id: ID!, target_column_id: ID!): Boolean!
    "File a case; it gets the next QA-<n> key and lands at the bottom of its column."
    createManualCase(input: ManualTestCaseInput!): ManualTestCase!
    """
    Change some fields of a case. With expected_updated_at, a case someone else
    saved in the meantime is refused (CONFLICT).
    """
    updateManualCase(id: ID!, input: ManualTestCaseInput!, expected_updated_at: String): ManualTestCase!
    """
    Move a case to a column and a place in it: directly after after_id, or
    directly before before_id, or at the bottom when neither is given. Writes
    one case. A stale expected_updated_at, or a neighbour no longer in that
    column, is refused (CONFLICT) so the board reloads.
    """
    moveManualCase(id: ID!, column_id: ID!, before_id: ID, after_id: ID, expected_updated_at: String): ManualTestCard!
    "Delete a case with its comments."
    deleteManualCase(id: ID!): Boolean!
    addManualCaseComment(case_id: ID!, body: String!): ManualTestComment!
    "The author only."
    editManualCaseComment(id: ID!, body: String!): ManualTestComment!
    "The author, or a super admin."
    deleteManualCaseComment(id: ID!): Boolean!
  }
`;
