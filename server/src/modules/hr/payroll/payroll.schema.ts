/**
 * Three typeDefs exports, one per console and MCP category: HR prepares and
 * approves (`hr`), Finance releases and pays (`finance`), and an employee
 * reads their own payslips (`employee`). Amounts are rupees; dates YYYY-MM-DD.
 */
export const hrPayrollTypeDefs = /* GraphQL */ `
  "DRAFT -> APPROVED (HR) -> RELEASED (Finance) -> COMPLETED (every payable salary paid)."
  enum HrPayrollRunStatus {
    DRAFT
    APPROVED
    RELEASED
    COMPLETED
  }

  enum HrPayrollSource {
    SCHEDULER
    MANUAL
  }

  "NO_COMPENSATION, NO_BANK, NEGATIVE_NET and UNSUPPORTED_CURRENCY stop a salary being paid until fixed or held; the others are for information."
  enum HrPayrollIssue {
    NO_COMPENSATION
    NO_BANK
    NEGATIVE_NET
    UNSUPPORTED_CURRENCY
    PENDING_LEAVE
    TARGET_NOT_REVIEWED
  }

  enum HrPayrollAdjustmentType {
    EARNING
    DEDUCTION
  }

  enum HrPayoutStatus {
    PROCESSING
    PAID
    FAILED
  }

  "SAME_MONTH pays a month on its own pay day; NEXT_MONTH on that day of the month after."
  enum HrPayTiming {
    SAME_MONTH
    NEXT_MONTH
  }

  enum HrPayoutMode {
    IMPS
    NEFT
  }

  type HrPayrollStep {
    by: String!
    at: String
    note: String
  }

  type HrPayrollTotals {
    employees: Int!
    held: Int!
    gross: Float!
    deductions: Float!
    net: Float!
    employer: Float!
  }

  type HrPayrollPayable {
    count: Int!
    "Their net pay in rupees."
    net: Float!
    "Salaries HR held, which releasing does not pay."
    held: Int!
  }

  "How the run's salaries stand with Razorpay."
  type HrPayrollPayoutSummary {
    paid: Int!
    processing: Int!
    failed: Int!
    waiting: Int!
    held: Int!
  }

  type HrPayrollRun {
    id: ID!
    "YYYY-MM"
    month: String!
    status: HrPayrollRunStatus!
    "The pay day from the payroll settings when the run was made."
    scheduled_pay_date: String!
    "The day Finance released it for; payouts start that day."
    pay_on: String
    source: HrPayrollSource!
    totals: HrPayrollTotals!
    computed_at: String
    computed_by: String!
    approved: HrPayrollStep
    "The account that approved it — it may not release it."
    approved_by_id: ID
    released: HrPayrollStep
    "The last time it was sent back to draft, and why."
    returned: HrPayrollStep
    "True for a draft whose pay, leave, targets or employee records changed after it was computed: recompute before approving."
    needs_recompute: Boolean!
    payout_summary: HrPayrollPayoutSummary!
    "What releasing pays: salaries that are not held, have nothing blocking them and have something to pay."
    payable: HrPayrollPayable!
    "Send it back as expected_revision."
    revision: Int!
    created_at: String
  }

  type HrPayrollRunTablePage {
    rows: [HrPayrollRun!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type HrPayrollAmount {
    label: String!
    "The monthly figure on the pay revision."
    monthly_amount: Float!
    "What this month pays after joining, exit and unpaid leave."
    amount: Float!
  }

  "Target-linked pay for one reviewed month."
  type HrPayrollVariable {
    target_id: ID!
    target_month: String!
    label: String!
    base_amount: Float!
    completion_percent: Int!
    amount: Float!
  }

  type HrPayrollAdjustment {
    id: ID!
    label: String!
    type: HrPayrollAdjustmentType!
    amount: Float!
    note: String
    by: String!
    at: String
  }

  type HrPayrollPayout {
    status: HrPayoutStatus!
    attempt: Int!
    "Bank reference, once paid."
    utr: String
    failure_reason: String
    razorpay_payout_id: String
    initiated_at: String
    completed_at: String
  }

  type HrPayrollLine {
    id: ID!
    run_id: ID!
    month: String!
    employee_id: ID!
    employee_name: String!
    employee_code: String!
    job_title: String!
    department: String
    date_of_joining: String!
    last_working_day: String
    currency: String!
    days_in_month: Int!
    payable_days: Float!
    lop_days: Float!
    earnings: [HrPayrollAmount!]!
    variable: [HrPayrollVariable!]!
    deductions: [HrPayrollAmount!]!
    employer: [HrPayrollAmount!]!
    adjustments: [HrPayrollAdjustment!]!
    gross: Float!
    deductions_total: Float!
    net: Float!
    employer_total: Float!
    issues: [HrPayrollIssue!]!
    hold: HrPayrollStep
    "The account the salary goes to, copied at release."
    bank_last4: String
    bank_ifsc: String
    payout: HrPayrollPayout
    "True once released: the employee can see this payslip."
    published: Boolean!
  }

  type HrPayrollLineTablePage {
    rows: [HrPayrollLine!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type HrPayrollEvent {
    id: ID!
    action: String!
    actor: String!
    line_id: ID
    note: String
    created_at: String
  }

  "The next run the settings point at."
  type HrPayrollUpcoming {
    month: String!
    draft_date: String!
    pay_date: String!
  }

  type HrPayrollSettings {
    scheduler_enabled: Boolean!
    pay_timing: HrPayTiming!
    "1-31; a day past the month's end means its last day."
    pay_day: Int!
    "The scheduler drafts a run this many days before its pay day."
    draft_lead_days: Int!
    payout_mode: HrPayoutMode!
    "False until the Razorpay keys and the RazorpayX account number are set in the Tech portal."
    payouts_configured: Boolean!
    upcoming: HrPayrollUpcoming
    updated_at: String
  }

  input HrPayrollSettingsInput {
    scheduler_enabled: Boolean!
    pay_timing: HrPayTiming!
    pay_day: Int!
    draft_lead_days: Int!
    payout_mode: HrPayoutMode!
  }

  input HrPayrollAdjustmentInput {
    label: String!
    type: HrPayrollAdjustmentType!
    "Rupees, above zero, at most two decimals."
    amount: Float!
    note: String
  }

  extend type Query {
    "HR and Finance: every payroll run (DUNCIT TABLE CONTRACT v1), newest month first."
    hrPayrollRunsTable(query: TableQueryInput): HrPayrollRunTablePage!
    hrPayrollRun(id: ID!): HrPayrollRun!
    "HR and Finance: one run's salaries (DUNCIT TABLE CONTRACT v1)."
    hrPayrollLinesTable(run_id: ID!, query: TableQueryInput): HrPayrollLineTablePage!
    hrPayrollLine(id: ID!): HrPayrollLine!
    "HR and Finance: what happened to a run, newest first."
    hrPayrollRunHistory(id: ID!): [HrPayrollEvent!]!
    hrPayrollSettings: HrPayrollSettings!
    "HR: any salary line as a payslip PDF, a draft too."
    hrPayslipPdfBase64(line_id: ID!): String!
  }

  extend type Mutation {
    "Prepare a month's payroll from the pay in force, unpaid leave and reviewed targets. One run per month."
    createHrPayrollRun(month: String!): HrPayrollRun!
    "Work a draft out again from the records, keeping its adjustments and holds."
    recomputeHrPayrollRun(id: ID!, expected_revision: Int!): HrPayrollRun!
    "Add a one-off earning or deduction to a salary in a draft. Never your own."
    addHrPayrollAdjustment(line_id: ID!, input: HrPayrollAdjustmentInput!): HrPayrollLine!
    removeHrPayrollAdjustment(line_id: ID!, adjustment_id: ID!): HrPayrollLine!
    "Keep a salary out of the payout, with a reason. Never your own."
    holdHrPayrollLine(line_id: ID!, reason: String!): HrPayrollLine!
    unholdHrPayrollLine(line_id: ID!): HrPayrollLine!
    "HR signs a draft off for Finance to release. Refused while anything blocks a salary or the inputs changed since the last compute."
    approveHrPayrollRun(id: ID!, expected_revision: Int!, note: String): HrPayrollRun!
    "Send an approved run back to draft, with what needs to change (HR, or Finance declining to release it)."
    returnHrPayrollRun(id: ID!, note: String!): HrPayrollRun!
    "Delete a draft run."
    deleteHrPayrollRun(id: ID!): Boolean!
    updateHrPayrollSettings(input: HrPayrollSettingsInput!): HrPayrollSettings!
  }
`;

export const financePayrollTypeDefs = /* GraphQL */ `
  extend type Mutation {
    "Finance: release an approved payroll for a pay date (today or up to 60 days ahead). Not by the person who approved it. Salaries are paid through RazorpayX on that day."
    releaseHrPayrollRun(id: ID!, pay_on: String!, note: String, "The run's revision when the releaser opened it; a changed run is refused." expected_revision: Int): HrPayrollRun!
    "Finance: get one salary's payout moving again — a new attempt if it failed, a resend or status check if it is in flight."
    retryHrPayrollPayout(line_id: ID!): HrPayrollLine!
    "Finance: pay a salary HR held, once its reason is fixed. Reads the bank account fresh from the HR record."
    payHeldHrPayrollLine(line_id: ID!, note: String): HrPayrollLine!
  }
`;

export const myPayrollTypeDefs = /* GraphQL */ `
  "ON_HOLD and NOT_PAYABLE are not being paid in this run; SCHEDULED waits for the pay day."
  enum PayslipStatus {
    ON_HOLD
    NOT_PAYABLE
    SCHEDULED
    PROCESSING
    PAID
    FAILED
  }

  "One released salary as its employee reads it."
  type MyPayslip {
    id: ID!
    month: String!
    currency: String!
    days_in_month: Int!
    payable_days: Float!
    lop_days: Float!
    earnings: [HrPayrollAmount!]!
    variable: [HrPayrollVariable!]!
    deductions: [HrPayrollAmount!]!
    employer: [HrPayrollAmount!]!
    adjustments: [HrPayrollAdjustment!]!
    gross: Float!
    deductions_total: Float!
    net: Float!
    employer_total: Float!
    status: PayslipStatus!
    pay_on: String
    paid_at: String
    "Bank reference, once paid."
    reference: String
    bank_last4: String
  }

  extend type Query {
    "Employee console: your payslips, newest month first (the last three years)."
    myPayslips: [MyPayslip!]!
    myPayslip(id: ID!): MyPayslip!
    myPayslipPdfBase64(id: ID!): String!
  }
`;
