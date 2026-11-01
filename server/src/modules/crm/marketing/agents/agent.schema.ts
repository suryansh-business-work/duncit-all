import gql from 'graphql-tag';

/** Marketing → Automation → Agents: the code-defined agents, what a manager set on each, and Run now. */
export const marketingAgentTypeDefs = gql`
  "The agents the Marketing console ships; each is defined in code and switched on from the console."
  enum MarketingAgentKey {
    CONTENT_PLANNER
    COMMUNITY_WATCH
    ACCOUNT_DOCTOR
  }

  enum MarketingAgentCadence {
    DAY
    WEEK
  }

  "When an agent runs, on the admin-configured clock (Settings › time zone)."
  type MarketingAgentSchedule {
    every: MarketingAgentCadence!
    "0–23."
    hour: Int!
    "0 Sunday … 6 Saturday; read for WEEK only."
    weekday: Int!
  }

  "What an agent is told. Only an agent with has_params reads these."
  type MarketingAgentParams {
    brief: String!
    "Empty means every connected network."
    networks: [SocialPlatform!]!
    posts_per_week: Int!
  }

  type MarketingAgent {
    key: MarketingAgentKey!
    name: String!
    description: String!
    enabled: Boolean!
    schedule: MarketingAgentSchedule!
    params: MarketingAgentParams!
    "Whether the agent reads params at all — the console shows the form only when it does."
    has_params: Boolean!
    "The only tools its plan may call."
    tools: [String!]!
    "Whether what it produces waits for a person on Approvals before anything goes out."
    needs_approval: Boolean!
    last_run_at: String
    "The marketing run the last run was recorded as, or empty."
    last_run_id: String!
    last_run_status: MarketingRunStatus
    "When the orchestrator will next run it; null while it is switched off."
    next_run_at: String
    updated_at: String
  }

  input MarketingAgentScheduleInput {
    every: MarketingAgentCadence!
    hour: Int!
    "Required in effect for WEEK; ignored for DAY."
    weekday: Int
  }

  input MarketingAgentParamsInput {
    brief: String
    networks: [SocialPlatform!]
    posts_per_week: Int
  }

  "Every field is optional: what is left out keeps its saved value."
  input UpdateMarketingAgentInput {
    enabled: Boolean
    schedule: MarketingAgentScheduleInput
    params: MarketingAgentParamsInput
  }

  extend type Query {
    "Every agent, with its switch, schedule, params and last run."
    marketingAgents: [MarketingAgent!]!
  }

  extend type Mutation {
    "Switch, reschedule or reconfigure one agent."
    updateMarketingAgent(key: MarketingAgentKey!, input: UpdateMarketingAgentInput!): MarketingAgent!
    "Run one agent now, as the signed-in person. Answers with the marketing run's id; the work goes on in the background."
    runMarketingAgent(key: MarketingAgentKey!): ID!
  }
`;
