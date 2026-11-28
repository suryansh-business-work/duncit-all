/**
 * Two typeDefs exports, like the employee record: the HR console's half is
 * filed under the MCP `hr` category and the Employee console's half (which
 * includes a manager deciding on their team's requests) under `employee`.
 */
export const hrLeaveTypeDefs = /* GraphQL */ `
  "YEARLY grants the year's quota on its first day (or on joining); MONTHLY grants a twelfth each month."
  enum HrLeaveAccrual {
    YEARLY
    MONTHLY
  }

  enum HrLeaveStatus {
    PENDING
    APPROVED
    REJECTED
    CANCELLED
  }

  "A half day is only allowed on a one-day request."
  enum HrHalfDay {
    FIRST_HALF
    SECOND_HALF
  }

  "A kind of leave HR offers. Never deleted: switch it off to retire it."
  type HrLeaveType {
    id: ID!
    name: String!
    code: String!
    "False for unpaid leave: no balance, and payroll deducts its days."
    paid: Boolean!
    "Days per leave year, in halves."
    annual_quota: Float!
    accrual: HrLeaveAccrual!
    "The most days a closing balance carries into the next leave year."
    carry_forward_max: Float!
    allow_half_day: Boolean!
    active: Boolean!
    updated_at: String
  }

  input HrLeaveTypeInput {
    name: String!
    "1-12 capital letters, digits or _, starting with a letter. Unique."
    code: String!
    paid: Boolean!
    annual_quota: Float!
    accrual: HrLeaveAccrual!
    carry_forward_max: Float!
    allow_half_day: Boolean!
    active: Boolean!
  }

  "One leave type's figures for one leave year. available is null for unpaid leave."
  type HrLeaveBalance {
    leave_type: HrLeaveType!
    year: Int!
    granted: Float!
    carried: Float!
    adjusted: Float!
    taken: Float!
    pending: Float!
    available: Float
  }

  "Dates are YYYY-MM-DD; days counts working days only."
  type HrLeaveRequest {
    id: ID!
    employee_id: ID!
    employee_name: String!
    employee_code: String!
    leave_type_id: ID!
    leave_type_name: String!
    paid: Boolean!
    start_date: String!
    end_date: String!
    half_day: HrHalfDay
    days: Float!
    reason: String
    status: HrLeaveStatus!
    "True when no reporting manager was on record, so HR decides."
    routed_to_hr: Boolean!
    decided_by: String
    decided_at: String
    decision_note: String
    decided_as_hr: Boolean
    cancelled_by: String
    cancelled_at: String
    cancellation_note: String
    "Whether the employee may still cancel it: waiting, or approved and not started."
    can_cancel: Boolean!
    created_at: String
  }

  type HrLeaveRequestTablePage {
    rows: [HrLeaveRequest!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type HrLeaveAdjustment {
    id: ID!
    leave_type_id: ID!
    leave_type_name: String!
    leave_year: Int!
    days: Float!
    note: String!
    by: String!
    created_at: String
  }

  type HrLeaveBalanceSheet {
    employee_id: ID!
    employee_name: String!
    year: Int!
    balances: [HrLeaveBalance!]!
    adjustments: [HrLeaveAdjustment!]!
  }

  input HrLeaveAdjustmentInput {
    employee_id: ID!
    leave_type_id: ID!
    "The calendar year the leave year starts in."
    leave_year: Int!
    "Positive adds days, negative removes them; in halves."
    days: Float!
    note: String!
  }

  type HrLeaveSettings {
    "0 = Sunday ... 6 = Saturday."
    weekly_off_days: [Int!]!
    "1 = January-December, 4 = April-March."
    leave_year_start_month: Int!
    backdate_days: Int!
    "Balances never carry forward from a year before this one."
    tracking_start_year: Int!
    current_leave_year: Int!
    updated_at: String
  }

  input HrLeaveSettingsInput {
    weekly_off_days: [Int!]!
    leave_year_start_month: Int!
    backdate_days: Int!
  }

  type HrHoliday {
    id: ID!
    date: String!
    name: String!
  }

  input HrHolidayInput {
    "YYYY-MM-DD, one holiday per date."
    date: String!
    name: String!
  }

  extend type Query {
    "HR console: every leave request (DUNCIT TABLE CONTRACT v1)."
    hrLeaveRequestsTable(query: TableQueryInput): HrLeaveRequestTablePage!
    "HR console: the leave types, switched-off ones too when asked."
    hrLeaveTypes(include_inactive: Boolean): [HrLeaveType!]!
    "HR console: one employee's balances and HR adjustments for a leave year (the current one by default)."
    hrLeaveBalances(employee_id: ID!, year: Int): HrLeaveBalanceSheet!
    hrLeaveSettings: HrLeaveSettings!
    "The holidays in a calendar year."
    hrHolidays(year: Int!): [HrHoliday!]!
  }

  extend type Mutation {
    "Add a leave type (no id) or change one."
    saveHrLeaveType(id: ID, input: HrLeaveTypeInput!): HrLeaveType!
    "Add or remove days from a balance, with a reason. Never your own."
    adjustHrLeaveBalance(input: HrLeaveAdjustmentInput!): Boolean!
    "Cancel a waiting or approved request; the employee is told why."
    cancelHrLeaveRequest(id: ID!, note: String!): HrLeaveRequest!
    updateHrLeaveSettings(input: HrLeaveSettingsInput!): HrLeaveSettings!
    "Add a holiday (no id) or rename or move one. Requests already made keep the days they cost."
    saveHrHoliday(id: ID, input: HrHolidayInput!): HrHoliday!
    removeHrHoliday(id: ID!): Boolean!
  }
`;

export const myHrLeaveTypeDefs = /* GraphQL */ `
  "The Employee console's Leave page in one read."
  type MyLeaveOverview {
    employee_id: ID!
    "False once employment has ended."
    can_apply: Boolean!
    leave_year: Int!
    leave_year_from: String!
    leave_year_to: String!
    weekly_off_days: [Int!]!
    "How many days back leave may be asked for."
    backdate_days: Int!
    "The types that can be asked for."
    types: [HrLeaveType!]!
    balances: [HrLeaveBalance!]!
    "Waiting and approved leave that has not ended, soonest first."
    upcoming: [HrLeaveRequest!]!
    "True when someone reports to you, so you decide their leave."
    is_manager: Boolean!
    team_pending: Int!
  }

  "What a request would cost: working days, and the balance before and after (null for unpaid leave)."
  type MyLeavePreview {
    days: Float!
    available: Float
    available_after: Float
  }

  input LeaveRequestInput {
    leave_type_id: ID!
    "YYYY-MM-DD"
    start_date: String!
    "YYYY-MM-DD, on or after start_date."
    end_date: String!
    half_day: HrHalfDay
    reason: String
    "One id per press of Apply; a repeated press returns the request the first one made."
    client_request_id: String
  }

  extend type Query {
    "Employee console: your leave balances, types and upcoming leave. Null until HR has added you."
    myLeaveOverview: MyLeaveOverview
    "Employee console: your own leave requests (DUNCIT TABLE CONTRACT v1)."
    myLeaveRequestsTable(query: TableQueryInput): HrLeaveRequestTablePage!
    "Employee console: leave requests from the people who report to you."
    myTeamLeaveRequestsTable(query: TableQueryInput): HrLeaveRequestTablePage!
    "Employee console: what a request would cost before you send it."
    myLeavePreview(input: LeaveRequestInput!): MyLeavePreview
  }

  extend type Mutation {
    "Employee console: ask for leave. Your reporting manager decides, or HR when you have none."
    applyLeave(input: LeaveRequestInput!): HrLeaveRequest!
    "Employee console: cancel your own request while it waits, or approved leave that has not started."
    cancelMyLeave(id: ID!, note: String): HrLeaveRequest!
    "Approve or decline a waiting request: as the employee's reporting manager, or as HR. Never your own."
    decideLeaveRequest(id: ID!, approve: Boolean!, note: String): HrLeaveRequest!
  }
`;
