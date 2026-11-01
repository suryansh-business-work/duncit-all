import { gql } from '@apollo/client';
import type { MarketingRunStatus } from '../activity-page/queries';
import type { SocialPlatform } from '../social-accounts-page/queries';

/** The agents the Marketing console ships; each is defined in code and switched on from the console. */
export type MarketingAgentKey = 'CONTENT_PLANNER' | 'COMMUNITY_WATCH' | 'ACCOUNT_DOCTOR';
export type MarketingAgentCadence = 'DAY' | 'WEEK';

/** When an agent runs, on the admin-configured clock. `weekday` is 0 Sunday … 6 Saturday and read for WEEK only. */
export interface MarketingAgentSchedule {
  every: MarketingAgentCadence;
  hour: number;
  weekday: number;
}

/** What an agent is told. Only an agent with `has_params` reads these. */
export interface MarketingAgentParams {
  brief: string;
  /** Empty means every connected network. */
  networks: SocialPlatform[];
  posts_per_week: number;
}

export interface MarketingAgent {
  key: MarketingAgentKey;
  name: string;
  description: string;
  enabled: boolean;
  schedule: MarketingAgentSchedule;
  params: MarketingAgentParams;
  has_params: boolean;
  /** The only tools its plan may call. */
  tools: string[];
  /** Whether what it produces waits for a person on Approvals before anything goes out. */
  needs_approval: boolean;
  last_run_at: string | null;
  last_run_id: string;
  last_run_status: MarketingRunStatus | null;
  /** When the orchestrator will next run it; null while it is switched off. */
  next_run_at: string | null;
  updated_at: string | null;
}

export interface MarketingAgentScheduleInput {
  every: MarketingAgentCadence;
  hour: number;
  weekday?: number | null;
}

export interface MarketingAgentParamsInput {
  brief?: string | null;
  networks?: SocialPlatform[] | null;
  posts_per_week?: number | null;
}

/** Every field is optional: what is left out keeps its saved value. */
export interface UpdateMarketingAgentInput {
  enabled?: boolean | null;
  schedule?: MarketingAgentScheduleInput | null;
  params?: MarketingAgentParamsInput | null;
}

const AGENT_FIELDS = gql`
  fragment MarketingAgentFields on MarketingAgent {
    key
    name
    description
    enabled
    schedule {
      every
      hour
      weekday
    }
    params {
      brief
      networks
      posts_per_week
    }
    has_params
    tools
    needs_approval
    last_run_at
    last_run_id
    last_run_status
    next_run_at
    updated_at
  }
`;

/** Every agent, with its switch, schedule, params and last run. */
export const MARKETING_AGENTS = gql`
  query MarketingAgents {
    marketingAgents {
      ...MarketingAgentFields
    }
  }
  ${AGENT_FIELDS}
`;

/** Switch, reschedule or reconfigure one agent. */
export const UPDATE_MARKETING_AGENT = gql`
  mutation UpdateMarketingAgent($key: MarketingAgentKey!, $input: UpdateMarketingAgentInput!) {
    updateMarketingAgent(key: $key, input: $input) {
      ...MarketingAgentFields
    }
  }
  ${AGENT_FIELDS}
`;

/** Run one agent now, as the signed-in person. Answers with the marketing run's id. */
export const RUN_MARKETING_AGENT = gql`
  mutation RunMarketingAgent($key: MarketingAgentKey!) {
    runMarketingAgent(key: $key)
  }
`;
