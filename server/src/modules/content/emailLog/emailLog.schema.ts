export const emailLogTypeDefs = /* GraphQL */ `
  """
  One attempt to send an email — including the ones that never left.

  A provider's dashboard can only show what reached it. The rows that matter
  most here are the ones that did not: a switched-off template, a recipient with
  no address, a refusal. Those have no other record anywhere.
  """
  type EmailLog {
    id: ID!
    to: String!
    cc: [String!]!
    bcc: [String!]!
    subject: String!
    "The template slug, or empty for a raw-HTML send."
    template: String!
    "The header/footer fragment the template named, if any."
    fragment_key: String
    category: String!
    "SENT, SKIPPED (deliberately not sent) or FAILED."
    status: String!
    "Why, in one line, whenever the status is not SENT."
    reason: String!
    "smtp, or none when it never left. Older rows may name a retired provider."
    provider: String!
    "The provider's own id, for tracing a delivery complaint back to them."
    message_id: String!
    "Which surface caused it: SERVER, NATIVE, MWEB, WEBSITE, PORTAL, CRM, TEST."
    source: String!
    "The exact host or portal, when known."
    source_detail: String!
    duration_ms: Int!
    created_at: String
    """
    The body exactly as it was handed to the provider.

    Only the single-row query fills this in — a page of campaign rows would
    otherwise carry a megabyte of HTML nobody opened. Empty on the table.
    """
    html: String
    "The variables it rendered with, as a JSON object. Single-row query only."
    vars: String
  }

  type EmailLogTablePage {
    rows: [EmailLog!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Headline counts for the page's summary strip."
  type EmailLogStats {
    days: Int!
    sent: Int!
    skipped: Int!
    failed: Int!
    total: Int!
    """
    Every row ever kept, not just the window above.

    Approximate by design — it comes from collection metadata, and its only job
    is to tell an operator the scale of what "delete everything" would remove.
    """
    all_time_total: Int!
  }

  "One bar: a grouping key and how many rows fell into it."
  type EmailLogCountBucket {
    key: String!
    count: Int!
  }

  """
  An address that failed more than once in the window.

  Nothing in this product receives bounce notifications, so an address that
  keeps failing is the closest thing to a hard-bounce list that exists.
  """
  type EmailLogFailingAddress {
    address: String!
    failures: Int!
    last_reason: String!
    last_failed_at: String
  }

  """
  What the log says about deliverability over a window.

  Built to answer the question a provider's dashboard cannot: not "how many
  did we send", but "who did not get theirs, and why".
  """
  type EmailLogDashboard {
    range_days: Int!
    "Rows in the window — one per send attempt."
    attempts: Int!
    """
    People addressed in the window, which is not the same as attempts.

    A campaign goes out as one row per batch with its audience in bcc, so one
    attempt can be fifty recipients; the sending mailbox the row is addressed
    to is not one of them.
    """
    recipients: Int!
    sent: Int!
    skipped: Int!
    failed: Int!
    """
    Accepted by the mail server with part of the batch refused.

    The row reads SENT and somebody in it still did not get the email.
    """
    partially_refused: Int!
    """
    Sends that were accepted by nothing.

    With no provider entry configured the server falls back to a transport that
    accepts every message and discards it, so the row reads SENT with an empty
    rejection list. A sub-5ms handover is the only signature that leaves.
    """
    silently_discarded: Int!
    "Why the ones that did not go out did not go out, in fixed buckets."
    not_delivered_reasons: [EmailLogCountBucket!]!
    "Which templates they belonged to. The empty key is a raw-HTML send."
    not_delivered_templates: [EmailLogCountBucket!]!
    repeat_failures: [EmailLogFailingAddress!]!
  }

  extend type Query {
    "Every email attempt, newest first. Filter by status, category, source, template."
    emailLogsTable(query: TableQueryInput): EmailLogTablePage!
    "One attempt with its rendered body and variables — what the drawer opens."
    emailLog(id: ID!): EmailLog
    emailLogStats(days: Int): EmailLogStats!
    "Deliverability over the last N days. Defaults to 7, capped at 90."
    emailLogDashboard(range_days: Int): EmailLogDashboard!
  }

  extend type Mutation {
    "Delete the ticked rows. Returns how many actually went."
    deleteEmailLogs(ids: [ID!]!): Int!
    """
    Empty the log entirely. Returns how many rows went.

    Deliberately unscoped rather than filter-scoped: the table's filters are
    debounced and its total came from an earlier fetch, so a scoped delete
    would state one number in the confirmation and remove a different one.
    Deleting a filtered set is what deleteEmailLogs is for.
    """
    deleteAllEmailLogs: Int!
  }
`;
