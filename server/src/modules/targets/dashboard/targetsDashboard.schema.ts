export const targetsDashboardTypeDefs = /* GraphQL */ `
  "Live employee targets for one month, counted by status."
  type TargetsMonthCounts {
    total: Int!
    assigned: Int!
    submitted: Int!
    reviewed: Int!
    "Mean completion percent of the month's reports (submitted or reviewed), to one decimal. Null until someone reports."
    average_completion: Float
  }

  "Everything the Targets console's dashboard shows, read in one request."
  type TargetsDashboard {
    "YYYY-MM: the current month in the admin's time zone."
    month: String!
    "Targets set for the current month."
    current_month: TargetsMonthCounts!
    "Active employees a target can be assigned to, to read current_month.total against."
    active_employees: Int!
    "Reports waiting for a review, across every month."
    awaiting_review: Int!
    "The longest-waiting reports (at most 5), oldest submission first."
    review_queue: [EmployeeTarget!]!
    "Targets still unreported inside an open month-end reminder window (Targets > Settings)."
    reminders_due: Int!
    "Saved Growth Calculator runs."
    saved_calculations: Int!
    "The newest saved run. Null while nothing is saved."
    latest_calculation: GrowthCalculation
  }

  extend type Query {
    "Targets console: the dashboard's numbers: this month's employee targets, the review queue and the newest growth plan."
    targetsDashboard: TargetsDashboard!
  }
`;
