/** The Employee console's calendar (MCP category `employee`). */
export const myHrCalendarTypeDefs = /* GraphQL */ `
  enum HrCalendarEventKind {
    HOLIDAY
    "Your own leave, waiting or approved."
    LEAVE
    "Leave of someone who reports to you."
    TEAM_LEAVE
    "The day a month's salary is paid."
    PAYDAY
    "The last day to report on a monthly target."
    TARGET_DUE
  }

  "One thing on a day or a run of days. It carries data, not a sentence: the console writes the words."
  type HrCalendarEvent {
    kind: HrCalendarEventKind!
    start_date: String!
    end_date: String!
    "The holiday, the leave type, or (team leave) the colleague."
    name: String
    "The leave type, on team leave."
    detail: String
    "Leave status; for a payday SCHEDULED (released) or EXPECTED (from the settings)."
    status: String
    half_day: HrHalfDay
    "The payroll or target month the event is about (YYYY-MM)."
    ref_month: String
  }

  type MyHrCalendar {
    month: String!
    "0 = Sunday ... 6 = Saturday."
    weekly_off_days: [Int!]!
    is_manager: Boolean!
    events: [HrCalendarEvent!]!
  }

  extend type Query {
    "Employee console: holidays, your leave, your team's leave, payday and target due dates in a month (YYYY-MM)."
    myHrCalendar(month: String!): MyHrCalendar!
  }
`;
