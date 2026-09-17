export const backgroundJobTypeDefs = /* GraphQL */ `
  enum BackgroundJobStatus {
    RUNNING
    COMPLETED
    FAILED
    CANCELLED
  }

  "SELECTED deletes the ticked rows; ALL deletes every row matching the table's current view."
  enum BulkDeleteMode {
    SELECTED
    ALL
  }

  "One row a bulk delete could not remove, with the reason its own delete gave."
  type BackgroundJobFailure {
    id: String!
    message: String!
  }

  """
  A long-running piece of work a person started from a console — a bulk
  delete today. Kept on the server, so the header's progress survives page
  changes, refreshes and server restarts.
  """
  type BackgroundJob {
    id: ID!
    "The <name>Table query the rows come from."
    table: String!
    "What the person was looking at when they started it."
    label: String!
    "The page it was started from."
    url: String!
    mode: BulkDeleteMode!
    status: BackgroundJobStatus!
    "Rows in scope when the job started."
    total: Int!
    succeeded: Int!
    failed: Int!
    "The first refusals, capped — enough to say why."
    failures: [BackgroundJobFailure!]!
    "Why the whole job stopped, when it did."
    error_message: String!
    created_at: String!
    finished_at: String
  }

  input StartBulkDeleteInput {
    "The <name>Table query the portal table reads."
    table: String!
    mode: BulkDeleteMode!
    "That query's variables as JSON text — search, filters and pinned arguments."
    variables: String!
    "SELECTED only: the ticked row ids."
    ids: [String!]
    label: String
    url: String
  }

  extend type Query {
    "The <name>Table queries the caller is offered bulk delete on."
    bulkDeletableTables: [String!]!
    "The caller's own jobs that are running or not yet dismissed, newest first."
    myBackgroundJobs: [BackgroundJob!]!
  }

  extend type Mutation {
    """
    Start deleting rows from a table in the background. Each row goes through
    the table's own delete mutation, as the caller.
    """
    startBulkDelete(input: StartBulkDeleteInput!): BackgroundJob!
    "Stop a running job after the batch in hand."
    cancelBackgroundJob(id: ID!): BackgroundJob!
    "Hide one finished job from the drawer."
    dismissBackgroundJob(id: ID!): Boolean!
    "Hide every finished job; returns how many."
    clearFinishedBackgroundJobs: Int!
  }
`;
