import gql from 'graphql-tag';

export const leadAiTypeDefs = gql`
  enum CrmLeadAiActionType {
    EMAIL_DRAFT
    CREATE_REMINDER
    UPDATE_REMINDER
  }

  enum CrmLeadAiActionStatus {
    PROPOSED
    DONE
    DISMISSED
  }

  """
  One thing the assistant read before answering: profile, notes, activity,
  emails, calls, reminders, website or conversation.
  """
  type CrmLeadAiContextSource {
    key: String!
    """ Records read (notes, emails, reminders…); 1 for the profile. """
    items: Int!
    chars: Int!
    """ Estimated tokens, ~4 characters per token. """
    tokens: Int!
    """ True when the source's budget cut older records off. """
    truncated: Boolean!
  }

  type CrmLeadAiContext {
    sources: [CrmLeadAiContextSource!]!
    total_tokens: Int!
    total_chars: Int!
    built_at: String!
  }

  """
  A proposal on an answer. Nothing runs until the agent confirms it in the
  panel, which then uses the regular email / reminder mutations.
  """
  type CrmLeadAiAction {
    type: CrmLeadAiActionType!
    status: CrmLeadAiActionStatus!
    to: String
    subject: String
    body_html: String
    reminder_id: ID
    title: String
    due_at: String
    notes: String
    reminder_status: CrmReminderStatus
    result_message: String
  }

  type CrmLeadAiMessage {
    id: ID!
    """ user | assistant """
    role: String!
    content: String!
    actions: [CrmLeadAiAction!]!
    created_at: String
  }

  type CrmLeadAiThread {
    messages: [CrmLeadAiMessage!]!
    context: CrmLeadAiContext!
  }

  type CrmLeadAiReply {
    user_message: CrmLeadAiMessage!
    assistant_message: CrmLeadAiMessage!
    context: CrmLeadAiContext!
  }

  extend type Query {
    """ The signed-in agent's Ask AI conversation about one lead, with a fresh context summary. """
    crmLeadAiThread(entity: CrmEntityType!, lead_id: ID!): CrmLeadAiThread!
  }

  extend type Mutation {
    """ Ask about a lead; the question and answer are saved to the agent's thread. """
    askCrmLeadAi(entity: CrmEntityType!, lead_id: ID!, message: String!): CrmLeadAiReply!
    """ Record that a proposal was carried out or dismissed. """
    setCrmLeadAiActionStatus(
      entity: CrmEntityType!
      lead_id: ID!
      message_id: ID!
      action_index: Int!
      status: CrmLeadAiActionStatus!
      result_message: String
    ): CrmLeadAiMessage!
    """ Start the agent's conversation about this lead over. """
    clearCrmLeadAiThread(entity: CrmEntityType!, lead_id: ID!): Boolean!
  }
`;
