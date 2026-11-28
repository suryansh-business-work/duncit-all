/**
 * Two typeDefs exports on purpose: the Targets console's half is filed under
 * the MCP `targets` category and the employee's own half under `employee`, so
 * each connector offers exactly the tools its console has.
 */
export const employeeTargetTypeDefs = /* GraphQL */ `
  "Where a monthly employee target is in its life."
  enum EmployeeTargetStatus {
    "Set by the Targets console; the employee has not reported yet."
    ASSIGNED
    "The employee reported progress; they can still correct it until it is reviewed."
    SUBMITTED
    "An admin reviewed the report. Read-only unless reopened."
    REVIEWED
  }

  "A person on a target record, as they were when they acted."
  type EmployeeTargetPerson {
    user_id: ID!
    name: String!
    email: String
  }

  "One goal the admin set for the month."
  type EmployeeTargetGoal {
    title: String!
    description: String!
    "Optional measurable figure (for example 40 leads)."
    target_value: Float
    "What target_value counts (leads, pods, rupees …). Empty when there is no figure."
    unit: String!
  }

  input EmployeeTargetGoalInput {
    title: String!
    description: String
    target_value: Float
    unit: String
  }

  "One achievement the employee reported."
  type EmployeeTargetAchievement {
    title: String!
    details: String!
  }

  input EmployeeTargetAchievementInput {
    title: String!
    details: String
  }

  "What the employee reported against the month's goals."
  type EmployeeTargetSubmission {
    "Whole percent, 0 to 100."
    completion_percent: Int!
    achievements: [EmployeeTargetAchievement!]!
    updates: String!
    submitted_at: String!
    "How many times it has been sent; 1 on the first submit."
    submission_count: Int!
  }

  type EmployeeTargetReview {
    comment: String!
    reviewed_by: EmployeeTargetPerson!
    reviewed_at: String!
  }

  "One employee's goals for one month and what they reported against them."
  type EmployeeTarget {
    id: ID!
    employee: EmployeeTargetPerson!
    "YYYY-MM"
    month: String!
    goals: [EmployeeTargetGoal!]!
    goal_count: Int!
    notes: String!
    status: EmployeeTargetStatus!
    submission: EmployeeTargetSubmission
    review: EmployeeTargetReview
    "True while it is unsubmitted inside the month-end reminder window (Targets > Settings), on the server's clock."
    reminder_active: Boolean!
    "Bumped by every write. Send it back as expected_revision."
    revision: Int!
    assigned_by: EmployeeTargetPerson!
    last_edited_by: EmployeeTargetPerson
    last_edited_at: String
    created_at: String!
    updated_at: String!
  }

  type EmployeeTargetTablePage {
    rows: [EmployeeTarget!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "An employee a target can be assigned to."
  type EmployeeTargetAssignee {
    id: ID!
    name: String!
    email: String
    photo: String
    "Employee code from the HR directory; null when HR has no current record for this account."
    employee_code: String
    "Job title from the HR directory."
    job_title: String
    "Department from the HR directory."
    department: String
  }

  "When employees are reminded to report on their month."
  type EmployeeTargetSettings {
    reminders_enabled: Boolean!
    "How many of the month's last days remind (1 = only the last day)."
    reminder_days_before_end: Int!
    "How many of the next month's first days still remind while unsubmitted (0 = none)."
    reminder_grace_days: Int!
    updated_at: String
  }

  input AssignEmployeeTargetInput {
    employee_id: ID!
    "YYYY-MM"
    month: String!
    goals: [EmployeeTargetGoalInput!]!
    notes: String
    "One id per press of Assign; a repeated press returns the record the first one made."
    client_request_id: String
  }

  input UpdateEmployeeTargetInput {
    goals: [EmployeeTargetGoalInput!]!
    notes: String
    "The revision the editor loaded. A record changed since is refused (CONFLICT)."
    expected_revision: Int!
  }

  input ReviewEmployeeTargetInput {
    comment: String
    expected_revision: Int!
  }

  input EmployeeTargetSettingsInput {
    reminders_enabled: Boolean
    reminder_days_before_end: Int
    reminder_grace_days: Int
  }

  extend type Query {
    "Targets console: every live monthly employee target (DUNCIT TABLE CONTRACT v1), newest month first."
    employeeTargetsTable(query: TableQueryInput): EmployeeTargetTablePage!
    "Targets console: one employee target with its goals, the employee's report and the review."
    employeeTarget(id: ID!): EmployeeTarget!
    "Targets console: active employees a target can be assigned to, by name or email (at most 20)."
    targetAssignableEmployees(search: String): [EmployeeTargetAssignee!]!
    "Targets console: the month-end reminder window."
    employeeTargetSettings: EmployeeTargetSettings!
  }

  extend type Mutation {
    "Assign an employee their goals for a month. One target per employee per month (CONFLICT otherwise)."
    assignEmployeeTarget(input: AssignEmployeeTargetInput!): EmployeeTarget!
    "Change a target's goals and notes — only while the employee has not reported yet."
    updateEmployeeTarget(id: ID!, input: UpdateEmployeeTargetInput!): EmployeeTarget!
    "Mark a submitted report as reviewed, with an optional comment the employee sees."
    reviewEmployeeTarget(id: ID!, input: ReviewEmployeeTargetInput!): EmployeeTarget!
    "Hand a reviewed report back to the employee to correct; the review is cleared."
    reopenEmployeeTarget(id: ID!, expected_revision: Int!): EmployeeTarget!
    "Remove a target from both consoles. The record is kept."
    deleteEmployeeTarget(id: ID!): Boolean!
    "Change the month-end reminder window. Values outside the allowed range are clamped."
    updateEmployeeTargetSettings(input: EmployeeTargetSettingsInput!): EmployeeTargetSettings!
  }
`;

export const myEmployeeTargetTypeDefs = /* GraphQL */ `
  input SubmitEmployeeTargetInput {
    "Whole percent, 0 to 100."
    completion_percent: Int!
    "At least one."
    achievements: [EmployeeTargetAchievementInput!]!
    updates: String
    "The revision the employee loaded. A record changed since is refused (CONFLICT)."
    expected_revision: Int!
  }

  extend type Query {
    "Employee console: your own monthly targets (DUNCIT TABLE CONTRACT v1), newest month first."
    myEmployeeTargetsTable(query: TableQueryInput): EmployeeTargetTablePage!
    "Employee console: one of your own monthly targets."
    myEmployeeTarget(id: ID!): EmployeeTarget!
    "Employee console: your targets still waiting for a progress report inside the month-end reminder window."
    myDueEmployeeTargets: [EmployeeTarget!]!
  }

  extend type Mutation {
    "Employee console: report your completion and achievements for a month. Allowed until it is reviewed."
    submitEmployeeTarget(id: ID!, input: SubmitEmployeeTargetInput!): EmployeeTarget!
  }
`;
