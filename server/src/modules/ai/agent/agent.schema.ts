import gql from 'graphql-tag';

export const agentTypeDefs = gql`
  enum AgentTurnRole {
    USER
    AGENT
  }

  input AgentTurnInput {
    role: AgentTurnRole!
    content: String!
  }

  input AgentChatInput {
    message: String!
    "The thread so far, so a follow-up still knows what 'the same again' meant."
    history: [AgentTurnInput!]
  }

  """
  One thing the agent tried to create. A failed item is still reported: a run
  that made seven of ten has to say which three did not, and why.
  """
  type AgentResultItem {
    "POD | CLUB"
    kind: String!
    ok: Boolean!
    "Document id, when it was created."
    id: String
    "Human reference — the pod/club slug."
    ref: String
    title: String!
    "What it was given (venue, approval state) — or the reason it failed."
    detail: String!
    """
    When the booked slot starts, as an ISO instant. Formatting is the console's
    job — the admin-configured date format and time zone live there, not here.
    """
    when: String
  }

  type AgentReply {
    "What the agent says back, before the results are listed."
    answer: String!
    "NONE | CREATE_PODS | CREATE_CLUBS"
    action: String!
    "How many the plan asked for, after the batch cap."
    requested: Int!
    created: Int!
    failed: Int!
    items: [AgentResultItem!]!
  }

  type AgentAvailability {
    "False when there is no OpenAI key — the composer says so instead of failing on send."
    is_available: Boolean!
    "Whether this caller may run creating actions at all."
    can_act: Boolean!
    "Most items one run will create."
    max_batch: Int!
  }

  extend type Query {
    agentAvailability: AgentAvailability!
  }

  extend type Mutation {
    agentChat(input: AgentChatInput!): AgentReply!
  }
`;
