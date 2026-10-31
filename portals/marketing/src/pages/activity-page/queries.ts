import { gql } from '@apollo/client';

/** PENDING and RUNNING are in flight; AWAITING_APPROVAL waits on a person; the rest are final. */
export type MarketingRunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';
/** What kind of work a run is. */
export type MarketingRunWorkflow =
  | 'SOCIAL_PUBLISH'
  | 'SOCIAL_SYNC'
  | 'SOCIAL_HEALTH'
  | 'INBOX_REPLY'
  | 'REEL'
  | 'LEAD_SEARCH'
  | 'LEAD_IMPORT'
  | 'OUTREACH'
  | 'AGENT'
  | 'ORCHESTRATOR'
  | 'CAMPAIGN'
  | 'OTHER';
export type MarketingRunTrigger = 'USER' | 'SCHEDULE' | 'WEBHOOK' | 'AGENT' | 'SYSTEM';
export type MarketingRunActorKind = 'USER' | 'AGENT' | 'SYSTEM';
export type MarketingRunStepStatus = 'PENDING' | 'RUNNING' | 'OK' | 'FAILED' | 'SKIPPED' | 'WAITING';
/** APPROVED lets the run continue; the other two stop it, with a note. */
export type MarketingRunDecision = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface MarketingRunActor {
  kind: MarketingRunActorKind;
  /** A user id, an agent key, or empty for the system. */
  id: string;
  name: string;
  email: string;
}

/** What the table lists: no steps, no API log. */
export interface MarketingRunRow {
  id: string;
  workflow: MarketingRunWorkflow;
  name: string;
  trigger: MarketingRunTrigger;
  status: MarketingRunStatus;
  actor: MarketingRunActor;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
}

export interface MarketingRunApproval {
  required: boolean;
  requested_at: string | null;
  decision: MarketingRunDecision | null;
  decided_by: string;
  decided_by_name: string;
  decided_at: string | null;
  note: string;
}

/** The row plus what an action can change — what every mutation hands back. */
export interface MarketingRunState extends MarketingRunRow {
  retries: number;
  error: string;
  /** The orchestrator run this one belongs to, or empty. */
  parent_run_id: string;
  cancel_requested: boolean;
  /** Whether Retry is offered: the run failed (or partly) and its workflow knows how to run again. */
  can_retry: boolean;
  approval: MarketingRunApproval;
}

/** One step of a run: what it did, with what, and how it went. */
export interface MarketingRunStep {
  key: string;
  label: string;
  status: MarketingRunStepStatus;
  tool: string;
  input_summary: string;
  output_summary: string;
  error: string;
  started_at: string | null;
  finished_at: string | null;
  ms: number;
}

/** One call to an outside service as the run saw it — never a token, never a full body. */
export interface MarketingRunApiEntry {
  at: string | null;
  service: string;
  method: string;
  url: string;
  status: number;
  ms: number;
  summary: string;
}

export interface MarketingRunCost {
  tokens_in: number;
  tokens_out: number;
  amount: number;
  currency: string;
}

/** Everything the drawer shows. */
export interface MarketingRunDetail extends MarketingRunState {
  cost: MarketingRunCost;
  steps: MarketingRunStep[];
  api_log: MarketingRunApiEntry[];
}

/** The numbers the Approvals and My Tasks cards lead with. */
export interface MarketingRunSummary {
  awaiting_approval: number;
  running: number;
  /** Runs that failed or partly completed in the last seven days. */
  failed_7d: number;
  /** The caller's own runs still in flight. */
  mine_open: number;
}

const RUN_ROW_FIELDS = gql`
  fragment MarketingRunRowFields on MarketingRun {
    id
    workflow
    name
    trigger
    status
    actor {
      kind
      id
      name
      email
    }
    started_at
    finished_at
    created_at
  }
`;

const RUN_STATE_FIELDS = gql`
  fragment MarketingRunStateFields on MarketingRun {
    ...MarketingRunRowFields
    retries
    error
    parent_run_id
    cancel_requested
    can_retry
    approval {
      required
      requested_at
      decision
      decided_by
      decided_by_name
      decided_at
      note
    }
  }
  ${RUN_ROW_FIELDS}
`;

/** Every run, newest first; the grid filters by workflow, status, trigger or actor. */
export const MARKETING_RUNS_TABLE = gql`
  query MarketingRunsTable($query: TableQueryInput) {
    marketingRunsTable(query: $query) {
      total
      rows {
        ...MarketingRunRowFields
      }
    }
  }
  ${RUN_ROW_FIELDS}
`;

/** One run with its steps and the calls it made — the drawer. */
export const MARKETING_RUN = gql`
  query MarketingRun($id: ID!) {
    marketingRun(id: $id) {
      ...MarketingRunStateFields
      cost {
        tokens_in
        tokens_out
        amount
        currency
      }
      steps {
        key
        label
        status
        tool
        input_summary
        output_summary
        error
        started_at
        finished_at
        ms
      }
      api_log {
        at
        service
        method
        url
        status
        ms
        summary
      }
    }
  }
  ${RUN_STATE_FIELDS}
`;

export const MARKETING_RUN_SUMMARY = gql`
  query MarketingRunSummary {
    marketingRunSummary {
      awaiting_approval
      running
      failed_7d
      mine_open
    }
  }
`;

/** Decide a run that is waiting for approval. A note is required unless it is approved. */
export const DECIDE_MARKETING_RUN = gql`
  mutation DecideMarketingRun($id: ID!, $decision: MarketingRunDecision!, $note: String) {
    decideMarketingRun(id: $id, decision: $decision, note: $note) {
      ...MarketingRunStateFields
    }
  }
  ${RUN_STATE_FIELDS}
`;

/** Stop a run: at once if it has not started, after its current step if it is running. */
export const CANCEL_MARKETING_RUN = gql`
  mutation CancelMarketingRun($id: ID!) {
    cancelMarketingRun(id: $id) {
      ...MarketingRunStateFields
    }
  }
  ${RUN_STATE_FIELDS}
`;

/** Run a failed or partly completed run again, through its own workflow. */
export const RETRY_MARKETING_RUN = gql`
  mutation RetryMarketingRun($id: ID!) {
    retryMarketingRun(id: $id) {
      ...MarketingRunStateFields
    }
  }
  ${RUN_STATE_FIELDS}
`;
