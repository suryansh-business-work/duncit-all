export const msg91TypeDefs = /* GraphQL */ `
  "One OTP widget request, as MSG91 recorded it."
  type Msg91WidgetLog {
    request_id: String!
    "Country code + number, digits only."
    identifier: String!
    "ISO instant MSG91 received it. Blank when MSG91's own time was unreadable."
    requested_at: String!
    "The code was verified."
    verified: Boolean!
    "The access token from that verification was checked as well."
    token_verified: Boolean!
    "How many verify calls the request took."
    verify_attempts: Int!
    "How many times the code was re-sent."
    retries: Int!
    user_ip: String!
    "Messages sent per channel for this request."
    sms: Int!
    whatsapp: Int!
    email: Int!
    voice: Int!
  }

  type Msg91WidgetLogPage {
    rows: [Msg91WidgetLog!]!
    "How many requests MSG91 holds for the window."
    total: Int!
  }

  "One day of widget traffic, or the window's total (date blank)."
  type Msg91WidgetDay {
    date: String!
    total: Int!
    verified: Int!
    token_verified: Int!
    retries: Int!
    sms: Int!
    whatsapp: Int!
    email: Int!
    voice: Int!
  }

  type Msg91WidgetAnalytics {
    days: [Msg91WidgetDay!]!
    total: Msg91WidgetDay
  }

  extend type Query {
    "Whether the default MSG91 entry holds both a widget ID and an auth key."
    msg91Configured: Boolean!
    """
    Every OTP widget request between two dates (yyyy-MM-dd). MSG91 allows at
    most 3 days in one window and no end date in the future.
    """
    msg91WidgetLogs(start_date: String!, end_date: String!): Msg91WidgetLogPage!
    "Per-day OTP widget traffic between two dates (yyyy-MM-dd, at most 31 days)."
    msg91WidgetAnalytics(start_date: String!, end_date: String!): Msg91WidgetAnalytics!
  }
`;
