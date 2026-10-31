import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  MARKETING_AGENTS,
  RUN_MARKETING_AGENT,
  UPDATE_MARKETING_AGENT,
  type MarketingAgent,
  type MarketingAgentKey,
  type UpdateMarketingAgentInput,
} from '../../src/pages/agents-page/queries';

export const makeAgent = (over: Partial<MarketingAgent> = {}): MarketingAgent => ({
  key: 'CONTENT_PLANNER',
  name: 'Content planner',
  description: 'Each week, writes post ideas and turns the best into posts.',
  enabled: false,
  schedule: { every: 'WEEK', hour: 9, weekday: 1 },
  params: { brief: '', networks: [], posts_per_week: 3 },
  has_params: true,
  tools: ['social.list_accounts', 'social.generate_ideas', 'social.create_post'],
  needs_approval: true,
  last_run_at: null,
  last_run_id: '',
  last_run_status: null,
  next_run_at: null,
  updated_at: null,
  ...over,
});

export const makeCommunityWatch = (over: Partial<MarketingAgent> = {}): MarketingAgent =>
  makeAgent({
    key: 'COMMUNITY_WATCH',
    name: 'Community watch',
    description: 'Each day, runs the AI review over new comments.',
    schedule: { every: 'DAY', hour: 8, weekday: 0 },
    has_params: false,
    tools: ['social.list_accounts', 'comments.analyze'],
    needs_approval: false,
    ...over,
  });

export const makeAccountDoctor = (over: Partial<MarketingAgent> = {}): MarketingAgent =>
  makeAgent({
    key: 'ACCOUNT_DOCTOR',
    name: 'Account doctor',
    description: 'Each day, checks every connected account.',
    schedule: { every: 'DAY', hour: 7, weekday: 0 },
    has_params: false,
    tools: ['social.list_accounts', 'accounts.health_check'],
    needs_approval: false,
    ...over,
  });

/** The agent as the server sends it: every object carries its GraphQL type name. */
export const typedAgent = (agent: MarketingAgent) => ({
  __typename: 'MarketingAgent',
  ...agent,
  schedule: { __typename: 'MarketingAgentSchedule', ...agent.schedule },
  params: { __typename: 'MarketingAgentParams', ...agent.params },
});

const rejection = (message: string) => ({ result: { errors: [new GraphQLError(message)] } });

/** `uses` lets one mock answer the refetch after a mutation as well as the first load. */
export const marketingAgentsMock = (agents: MarketingAgent[], uses = 1): MockedResponse => ({
  request: { query: MARKETING_AGENTS },
  result: { data: { marketingAgents: agents.map(typedAgent) } },
  maxUsageCount: uses,
});

export const marketingAgentsErrorMock = (message: string): MockedResponse => ({
  request: { query: MARKETING_AGENTS },
  ...rejection(message),
});

export const updateMarketingAgentMock = (key: MarketingAgentKey, input: UpdateMarketingAgentInput, agent: MarketingAgent): MockedResponse => ({
  request: { query: UPDATE_MARKETING_AGENT, variables: { key, input } },
  result: { data: { updateMarketingAgent: typedAgent(agent) } },
});

export const updateMarketingAgentErrorMock = (key: MarketingAgentKey, input: UpdateMarketingAgentInput, message: string): MockedResponse => ({
  request: { query: UPDATE_MARKETING_AGENT, variables: { key, input } },
  ...rejection(message),
});

export const runMarketingAgentMock = (key: MarketingAgentKey, runId: string): MockedResponse => ({
  request: { query: RUN_MARKETING_AGENT, variables: { key } },
  result: { data: { runMarketingAgent: runId } },
});

export const runMarketingAgentErrorMock = (key: MarketingAgentKey, message: string): MockedResponse => ({
  request: { query: RUN_MARKETING_AGENT, variables: { key } },
  ...rejection(message),
});
