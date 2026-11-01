import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  CANCEL_MARKETING_RUN,
  DECIDE_MARKETING_RUN,
  MARKETING_RUN,
  MARKETING_RUN_SUMMARY,
  RETRY_MARKETING_RUN,
  type MarketingRunApiEntry,
  type MarketingRunApproval,
  type MarketingRunDecision,
  type MarketingRunDetail,
  type MarketingRunRow,
  type MarketingRunState,
  type MarketingRunStep,
  type MarketingRunSummary,
} from '../../src/pages/activity-page/queries';

export const makeRunRow = (over: Partial<MarketingRunRow> = {}): MarketingRunRow => ({
  id: 'run1',
  workflow: 'SOCIAL_PUBLISH',
  name: 'Publish: Diwali reel',
  trigger: 'USER',
  status: 'COMPLETED',
  actor: { kind: 'USER', id: 'u1', name: 'Asha Rao', email: 'asha@duncit.com' },
  started_at: '2026-10-30T10:00:00.000Z',
  finished_at: '2026-10-30T10:00:12.000Z',
  created_at: '2026-10-30T09:59:58.000Z',
  ...over,
});

export const makeRunApproval = (over: Partial<MarketingRunApproval> = {}): MarketingRunApproval => ({
  required: false,
  requested_at: null,
  decision: null,
  decided_by: '',
  decided_by_name: '',
  decided_at: null,
  note: '',
  ...over,
});

export const makeRunStep = (over: Partial<MarketingRunStep> = {}): MarketingRunStep => ({
  key: 'render',
  label: 'Render the reel',
  status: 'OK',
  tool: 'reel.render',
  input_summary: '3 clips, 15s',
  output_summary: 'reel-42.mp4',
  error: '',
  started_at: '2026-10-30T10:00:00.000Z',
  finished_at: '2026-10-30T10:00:08.000Z',
  ms: 8000,
  ...over,
});

export const makeRunApiEntry = (over: Partial<MarketingRunApiEntry> = {}): MarketingRunApiEntry => ({
  at: '2026-10-30T10:00:09.000Z',
  service: 'instagram',
  method: 'POST',
  url: '/v21.0/me/media',
  status: 200,
  ms: 640,
  summary: 'container created',
  ...over,
});

export const makeRunState = (over: Partial<MarketingRunState> = {}): MarketingRunState => ({
  ...makeRunRow(),
  retries: 0,
  error: '',
  parent_run_id: '',
  cancel_requested: false,
  can_retry: false,
  approval: makeRunApproval(),
  ...over,
});

export const makeRunDetail = (over: Partial<MarketingRunDetail> = {}): MarketingRunDetail => ({
  ...makeRunState(),
  cost: { tokens_in: 0, tokens_out: 0, amount: 0, currency: 'USD' },
  steps: [makeRunStep()],
  api_log: [makeRunApiEntry()],
  ...over,
});

export const makeRunSummary = (over: Partial<MarketingRunSummary> = {}): MarketingRunSummary => ({
  awaiting_approval: 3,
  running: 2,
  failed_7d: 5,
  mine_open: 1,
  ...over,
});

/** The state fields as the server sends them: every object carries its GraphQL type name. */
export const typedRunState = (run: MarketingRunState) => ({
  __typename: 'MarketingRun',
  id: run.id,
  workflow: run.workflow,
  name: run.name,
  trigger: run.trigger,
  status: run.status,
  actor: { __typename: 'MarketingRunActor', ...run.actor },
  started_at: run.started_at,
  finished_at: run.finished_at,
  created_at: run.created_at,
  retries: run.retries,
  error: run.error,
  parent_run_id: run.parent_run_id,
  cancel_requested: run.cancel_requested,
  can_retry: run.can_retry,
  approval: { __typename: 'MarketingRunApproval', ...run.approval },
});

/** The whole run as the drawer's query receives it. */
export const typedRunDetail = (run: MarketingRunDetail) => ({
  ...typedRunState(run),
  cost: { __typename: 'MarketingRunCost', ...run.cost },
  steps: run.steps.map((step) => ({ __typename: 'MarketingRunStep', ...step })),
  api_log: run.api_log.map((entry) => ({ __typename: 'MarketingRunApiEntry', ...entry })),
});

const rejection = (message: string) => ({ result: { errors: [new GraphQLError(message)] } });

/** `uses` lets one mock answer the drawer's refetch after an action as well as its first load. */
export const marketingRunMock = (run: MarketingRunDetail, uses = 1): MockedResponse => ({
  request: { query: MARKETING_RUN, variables: { id: run.id } },
  result: { data: { marketingRun: typedRunDetail(run) } },
  maxUsageCount: uses,
});

export const marketingRunErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: MARKETING_RUN, variables: { id } },
  ...rejection(message),
});

export const marketingRunSummaryMock = (summary: MarketingRunSummary): MockedResponse => ({
  request: { query: MARKETING_RUN_SUMMARY },
  result: { data: { marketingRunSummary: { __typename: 'MarketingRunSummary', ...summary } } },
});

export const marketingRunSummaryErrorMock = (message: string): MockedResponse => ({
  request: { query: MARKETING_RUN_SUMMARY },
  ...rejection(message),
});

export const retryMarketingRunMock = (run: MarketingRunState): MockedResponse => ({
  request: { query: RETRY_MARKETING_RUN, variables: { id: run.id } },
  result: { data: { retryMarketingRun: typedRunState(run) } },
});

export const retryMarketingRunErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: RETRY_MARKETING_RUN, variables: { id } },
  ...rejection(message),
});

export const cancelMarketingRunMock = (run: MarketingRunState): MockedResponse => ({
  request: { query: CANCEL_MARKETING_RUN, variables: { id: run.id } },
  result: { data: { cancelMarketingRun: typedRunState(run) } },
});

export const cancelMarketingRunErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: CANCEL_MARKETING_RUN, variables: { id } },
  ...rejection(message),
});

export const decideMarketingRunMock = (
  run: MarketingRunState,
  decision: MarketingRunDecision,
  note: string | null,
): MockedResponse => ({
  request: { query: DECIDE_MARKETING_RUN, variables: { id: run.id, decision, note } },
  result: { data: { decideMarketingRun: typedRunState(run) } },
});

export const decideMarketingRunErrorMock = (
  id: string,
  decision: MarketingRunDecision,
  note: string | null,
  message: string,
): MockedResponse => ({
  request: { query: DECIDE_MARKETING_RUN, variables: { id, decision, note } },
  ...rejection(message),
});
