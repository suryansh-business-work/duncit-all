/**
 * Two typeDefs exports on purpose, like employee targets: the HR console's half
 * is filed under the MCP `hr` category and the employee's own half under
 * `employee`, so each connector offers exactly the tools its console has.
 */
export const hrEmployeeTypeDefs = /* GraphQL */ `
  "Where an employment record is in its life."
  enum HrEmployeeStatus {
    ACTIVE
    "Serving notice: still working until the last working day, then EXITED by the daily sweep."
    ON_NOTICE
    "Left. The record and its history are kept; Rehire reopens it."
    EXITED
  }

  enum HrEmploymentType {
    FULL_TIME
    PART_TIME
    CONTRACT
    INTERN
    CONSULTANT
  }

  enum HrGender {
    MALE
    FEMALE
    OTHER
  }

  enum HrExitType {
    RESIGNATION
    TERMINATION
    END_OF_CONTRACT
    RETIREMENT
    OTHER
  }

  enum HrJobChangeReason {
    PROMOTION
    TRANSFER
    ROLE_CHANGE
    MANAGER_CHANGE
    CORRECTION
  }

  enum HrPayComponentType {
    EARNING
    DEDUCTION
    EMPLOYER_CONTRIBUTION
  }

  enum HrCompensationReason {
    HIRE
    REVISION
    PROMOTION
    CORRECTION
  }

  enum HrEventKind {
    HIRED
    PERSONAL_UPDATED
    CONTACT_UPDATED
    JOB_CHANGED
    COMPENSATION_ADDED
    COMPENSATION_REMOVED
    BANK_UPDATED
    BANK_VIEWED
    EXIT_SCHEDULED
    EXIT_CANCELLED
    EXITED
    REHIRED
  }

  "Somebody who acted on a record, as they were named when they acted."
  type HrActor {
    user_id: ID!
    name: String!
  }

  type HrEmergencyContact {
    name: String!
    relation: String
    phone_number: String!
    phone_extension: String!
  }

  input HrEmergencyContactInput {
    name: String!
    relation: String
    phone_number: String!
    phone_extension: String!
  }

  "Dates are YYYY-MM-DD."
  type HrPersonal {
    first_name: String!
    last_name: String!
    gender: HrGender
    date_of_birth: String
    personal_email: String
    phone_number: String
    phone_extension: String
    current_address: String
    permanent_address: String
    emergency_contact: HrEmergencyContact
  }

  input HrPersonalInput {
    first_name: String!
    last_name: String!
    gender: HrGender
    "YYYY-MM-DD"
    date_of_birth: String
    personal_email: String
    phone_number: String
    phone_extension: String
    current_address: String
    permanent_address: String
    emergency_contact: HrEmergencyContactInput
  }

  "Another employee, as a picker or a reporting line shows them."
  type HrEmployeeRef {
    id: ID!
    employee_code: String!
    name: String!
    job_title: String
  }

  type HrJob {
    job_title: String!
    department: String
    work_location: String
    "The HR record id of the reporting manager."
    manager_id: ID
    manager: HrEmployeeRef
    employment_type: HrEmploymentType!
    date_of_joining: String!
    probation_end_date: String
    notice_period_days: Int!
    work_email: String
  }

  input HrJobInput {
    job_title: String!
    department: String
    work_location: String
    "An HR record id (hrManagerOptions). Never the employee themselves or someone who reports to them."
    manager_id: ID
    employment_type: HrEmploymentType!
    "YYYY-MM-DD"
    date_of_joining: String!
    "YYYY-MM-DD, on or after date_of_joining."
    probation_end_date: String
    notice_period_days: Int!
    work_email: String
  }

  "Bank and statutory details as every read shows them: account number and PAN masked to their last four."
  type HrBankSummary {
    account_holder_name: String
    account_number_masked: String
    ifsc: String
    bank_name: String
    pan_masked: String
    uan: String
  }

  "The full details. Each read is written to the worker history."
  type HrBankDetails {
    account_holder_name: String
    account_number: String
    ifsc: String
    bank_name: String
    pan: String
    uan: String
  }

  "Leave out account_number or pan to keep the stored value; send an empty string to clear it."
  input HrBankInput {
    account_holder_name: String
    account_number: String
    ifsc: String
    bank_name: String
    pan: String
    uan: String
  }

  type HrExit {
    exit_type: HrExitType!
    resignation_date: String
    last_working_day: String!
    reason: String
    eligible_for_rehire: Boolean!
    recorded_by: HrActor!
    recorded_at: String!
  }

  type HrEmployee {
    id: ID!
    "The Duncit account this person signs in with."
    user_id: ID!
    employee_code: String!
    status: HrEmployeeStatus!
    full_name: String!
    "The sign-in email of the account. Only filled on the profile."
    account_email: String
    personal: HrPersonal!
    job: HrJob!
    bank: HrBankSummary!
    exit: HrExit
    "Bumped by every write. Send it back as expected_revision."
    revision: Int!
    created_by: HrActor!
    updated_by: HrActor
    created_at: String!
    updated_at: String!
  }

  type HrEmployeeTablePage {
    rows: [HrEmployee!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "One line of pay, in rupees per month. A target-linked earning pays in proportion to the reviewed monthly target."
  type HrPayLine {
    label: String!
    type: HrPayComponentType!
    monthly_amount: Float!
    target_linked: Boolean!
  }

  input HrPayLineInput {
    label: String!
    type: HrPayComponentType!
    "Rupees per month, 0 or more."
    monthly_amount: Float!
    "Only an EARNING can be linked to targets."
    target_linked: Boolean
  }

  "Totals derived on the server from the lines. Target-linked earnings are counted at 100 percent."
  type HrCompensationTotals {
    gross_monthly: Float!
    fixed_gross_monthly: Float!
    variable_monthly: Float!
    deductions_monthly: Float!
    employer_monthly: Float!
    net_monthly: Float!
    annual_ctc: Float!
  }

  "One pay revision, in force from effective_from until the next revision starts."
  type HrCompensation {
    id: ID!
    employee_id: ID!
    currency: String!
    effective_from: String!
    reason: HrCompensationReason!
    note: String
    components: [HrPayLine!]!
    totals: HrCompensationTotals!
    "The revision in force today."
    is_current: Boolean!
    "Starts after today. Only these can be withdrawn."
    is_upcoming: Boolean!
    created_by: HrActor!
    created_at: String!
  }

  input HrCompensationInput {
    "3-letter code, for example INR."
    currency: String!
    "YYYY-MM-DD. One revision per day per employee."
    effective_from: String!
    "HIRE is written by the hire itself."
    reason: HrCompensationReason!
    note: String
    components: [HrPayLineInput!]!
  }

  type HrFieldChange {
    field: String!
    from: String
    to: String
  }

  "One row of the worker history."
  type HrEmployeeEvent {
    id: ID!
    kind: HrEventKind!
    effective_date: String!
    changes: [HrFieldChange!]!
    note: String
    actor: HrActor!
    created_at: String!
  }

  "An org-chart seat (HR > Team Structure) this person sits in."
  type HrSeatRef {
    structure_id: ID!
    structure_name: String!
    node_id: ID!
    title: String!
    department: String
  }

  type HrEmployeeProfile {
    employee: HrEmployee!
    "False when the account lost the EMPLOYEE role elsewhere while the record is still current."
    has_employee_access: Boolean!
    "Every pay revision, newest first."
    compensation: [HrCompensation!]!
    current_compensation: HrCompensation
    direct_reports: [HrEmployeeRef!]!
    seats: [HrSeatRef!]!
    "The Targets console page where this person's monthly targets are set."
    targets_console_url: String
  }

  "A Duncit account HR can hire into."
  type HrAccountOption {
    id: ID!
    name: String!
    email: String
    phone: String
    photo: String
    "True when the account already has an HR record (hire it again with Rehire instead)."
    has_hr_record: Boolean!
  }

  "An account holding Employee access that HR has no record for yet."
  type HrUnrecordedEmployee {
    id: ID!
    name: String!
    email: String
    photo: String
  }

  type HrDepartmentCount {
    department: String
    count: Int!
  }

  type HrEmployeeStats {
    active: Int!
    on_notice: Int!
    exited: Int!
    joined_this_month: Int!
    exited_this_month: Int!
    "Current (not exited) employees per department."
    by_department: [HrDepartmentCount!]!
  }

  input HireHrEmployeeInput {
    "An existing account (hrAccountOptions). Give this or new_account, never both."
    account_user_id: ID
    "Opens a new Duncit account with no password; the person signs in with a one-time code or Google."
    new_account: HrNewAccountInput
    "Leave empty for the next automatic code (HR > Settings)."
    employee_code: String
    personal: HrPersonalInput!
    job: HrJobInput!
    "The first pay revision; its reason is always HIRE."
    compensation: HrCompensationInput
    bank: HrBankInput
    "One id per press of Hire; a repeated press returns the record the first one made."
    client_request_id: String
  }

  input HrNewAccountInput {
    email: String!
    phone_number: String
    phone_extension: String
  }

  input HrJobChangeInput {
    job: HrJobInput!
    reason: HrJobChangeReason!
    "YYYY-MM-DD, today or earlier."
    effective_date: String!
    note: String
    expected_revision: Int!
  }

  input HrExitInput {
    exit_type: HrExitType!
    resignation_date: String
    "YYYY-MM-DD. Before today exits now; today or later serves notice until then."
    last_working_day: String!
    reason: String
    eligible_for_rehire: Boolean!
    expected_revision: Int!
  }

  input HrRehireInput {
    job: HrJobInput!
    note: String
    expected_revision: Int!
  }

  extend type Query {
    "HR console: every employment record (DUNCIT TABLE CONTRACT v1), newest joiners first."
    hrEmployeesTable(query: TableQueryInput): HrEmployeeTablePage!
    "HR console: one person's record, pay history, reporting line, org-chart seats and the Targets link."
    hrEmployee(id: ID!): HrEmployeeProfile!
    "HR console: the worker history, newest first."
    hrEmployeeHistory(id: ID!): [HrEmployeeEvent!]!
    "HR console: this person's monthly targets from the Targets console, newest month first (read-only)."
    hrEmployeeTargets(id: ID!): [EmployeeTarget!]!
    "HR console: the full bank account number and PAN. Every call is written to the worker history."
    hrEmployeeBankDetails(id: ID!): HrBankDetails!
    "HR console: current employees to choose as a manager (at most 20)."
    hrManagerOptions(search: String, exclude_id: ID): [HrEmployeeRef!]!
    "HR console: active Duncit accounts to hire into, by name, email or phone (at most 20; 2+ characters)."
    hrAccountOptions(search: String!): [HrAccountOption!]!
    "HR console: accounts with Employee access but no HR record."
    hrUnrecordedEmployees: [HrUnrecordedEmployee!]!
    "HR console: head counts for the dashboard."
    hrEmployeeStats: HrEmployeeStats!
  }

  extend type Mutation {
    "Hire: create the HR record, its first pay revision, and grant the account the Employee console."
    hireHrEmployee(input: HireHrEmployeeInput!): HrEmployeeProfile!
    "Change name, birth date and contact details."
    updateHrEmployeePersonal(id: ID!, input: HrPersonalInput!, expected_revision: Int!): HrEmployee!
    "Record a promotion, transfer or other job change, effective today or earlier."
    changeHrEmployeeJob(id: ID!, input: HrJobChangeInput!): HrEmployee!
    "Add a pay revision from its effective date. Totals are derived from the lines."
    addHrCompensation(employee_id: ID!, input: HrCompensationInput!): HrCompensation!
    "Withdraw a pay revision that has not started yet."
    removeHrCompensation(id: ID!): Boolean!
    "Change bank and statutory details. The account number and PAN are stored sealed."
    updateHrEmployeeBank(id: ID!, input: HrBankInput!, expected_revision: Int!): HrEmployee!
    "Record an exit. A past last working day exits now and removes the Employee console; otherwise notice is served."
    scheduleHrEmployeeExit(id: ID!, input: HrExitInput!): HrEmployee!
    "Keep someone who is serving notice."
    cancelHrEmployeeExit(id: ID!, expected_revision: Int!): HrEmployee!
    "Reopen a former employee's record with a new joining date and job, and give the Employee console back."
    rehireHrEmployee(id: ID!, input: HrRehireInput!): HrEmployee!
    "Give a current employee back the Employee console after it was removed elsewhere."
    restoreHrEmployeeAccess(id: ID!): HrEmployee!
  }
`;

export const myHrEmployeeTypeDefs = /* GraphQL */ `
  "Your own HR record and the pay in force today."
  type MyHrProfile {
    employee: HrEmployee!
    current_compensation: HrCompensation
  }

  "Replaces every contact field: send the ones you keep as well as the ones you change."
  input HrContactInput {
    personal_email: String
    phone_number: String
    phone_extension: String
    current_address: String
    permanent_address: String
    emergency_contact: HrEmergencyContactInput
  }

  extend type Query {
    "Employee console: your own HR record. Null until HR has added you."
    myHrProfile: MyHrProfile
  }

  extend type Mutation {
    "Employee console: change your own contact details and emergency contact."
    updateMyHrContact(input: HrContactInput!, expected_revision: Int!): MyHrProfile!
  }
`;
