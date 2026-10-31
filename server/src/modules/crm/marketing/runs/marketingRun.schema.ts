import gql from 'graphql-tag';

/** Marketing → Activity, Approvals and My Tasks: every automation and agent run, as a readable record. */
export const marketingRunTypeDefs = gql`
  "PENDING and RUNNING are in flight; AWAITING_APPROVAL waits on a person; the rest are final."
  enum MarketingRunStatus {
    PENDING
    RUNNING
    AWAITING_APPROVAL
    COMPLETED
    PARTIAL
    FAILED
    CANCELLED
  }

  "What kind of work a run is."
  enum MarketingRunWorkflow {
    SOCIAL_PUBLISH
    SOCIAL_SYNC
    SOCIAL_HEALTH
    REEL
    LEAD_SEARCH
    OUTREACH
    AGENT
    ORCHESTRATOR
    CAMPAIGN
    OTHER
  }

  enum MarketingRunTrigger {
    USER
    SCHEDULE
    WEBHOOK
    AGENT
    SYSTEM
  }

  enum MarketingRunActorKind {
    USER
    AGENT
    SYSTEM
  }

  enum MarketingRunStepStatus {
    PENDING
    RUNNING
    OK
    FAILED
    SKIPPED
    WAITING
  }

  "APPROVED lets the run continue; the other two stop it, with a note."
  enum MarketingRunDecision {
    APPROVED
    REJECTED
    CHANGES_REQUESTED
  }

  "One step of a run: what it did, with what, and how it went."
  type MarketingRunStep {
    key: String!
    label: String!
    status: MarketingRunStepStatus!
    "The tool or operation behind the step, when there is one."
    tool: String!
    input_summary: String!
    output_summary: String!
    error: String!
    started_at: String
    finished_at: String
    ms: Int!
  }

  "One call to an outside service as the run saw it — never a token, never a full body."
  type MarketingRunApiEntry {
    at: String
    service: String!
    method: String!
    url: String!
    status: Int!
    ms: Int!
    summary: String!
  }

  type MarketingRunActor {
    kind: MarketingRunActorKind!
    "A user id, an agent key, or empty for the system."
    id: String!
    name: String!
    email: String!
  }

  "What the run touched, each an id or empty."
  type MarketingRunLinks {
    account_id: String!
    campaign_id: String!
    lead_id: String!
    post_id: String!
    reel_id: String!
    agent_key: String!
  }

  type MarketingRunApproval {
    required: Boolean!
    requested_at: String
    decision: MarketingRunDecision
    decided_by: String!
    decided_by_name: String!
    decided_at: String
    note: String!
  }

  type MarketingRunCost {
    tokens_in: Int!
    tokens_out: Int!
    amount: Float!
    currency: String!
  }

  type MarketingRun {
    id: ID!
    workflow: MarketingRunWorkflow!
    name: String!
    trigger: MarketingRunTrigger!
    status: MarketingRunStatus!
    actor: MarketingRunActor!
    links: MarketingRunLinks!
    steps: [MarketingRunStep!]!
    api_log: [MarketingRunApiEntry!]!
    retries: Int!
    error: String!
    approval: MarketingRunApproval!
    cost: MarketingRunCost!
    "The orchestrator run this one belongs to, or empty."
    parent_run_id: String!
    cancel_requested: Boolean!
    "Whether Retry is offered: the run failed (or partly) and its workflow knows how to run again."
    can_retry: Boolean!
    started_at: String
    finished_at: String
    created_at: String
    updated_at: String
  }

  type MarketingRunTablePage {
    rows: [MarketingRun!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "The numbers the dashboard and My Tasks lead with."
  type MarketingRunSummary {
    awaiting_approval: Int!
    running: Int!
    "Runs that failed or partly completed in the last seven days."
    failed_7d: Int!
    "The caller's own runs still in flight."
    mine_open: Int!
  }

  extend type Query {
    "Every run, newest first; filter by workflow, status, trigger, actor or what it touched."
    marketingRunsTable(query: TableQueryInput): MarketingRunTablePage!
    marketingRun(id: ID!): MarketingRun!
    marketingRunSummary: MarketingRunSummary!
  }

  extend type Mutation {
    "Decide a run that is waiting for approval. A note is required unless it is approved."
    decideMarketingRun(id: ID!, decision: MarketingRunDecision!, note: String): MarketingRun!
    "Stop a run: at once if it has not started, after its current step if it is running."
    cancelMarketingRun(id: ID!): MarketingRun!
    "Run a failed or partly completed run again, through its own workflow."
    retryMarketingRun(id: ID!): MarketingRun!
  }
`;
