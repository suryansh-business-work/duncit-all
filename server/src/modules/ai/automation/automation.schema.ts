import gql from 'graphql-tag';

export const automationTypeDefs = gql`
  enum AutomationChannel {
    WHATSAPP
    EMAIL
  }

  enum AutomationFlowStatus {
    DRAFT
    ACTIVE
    PAUSED
  }

  enum AutomationRunMode {
    LIVE
    TEST
  }

  enum AutomationRunStatus {
    RUNNING
    WAITING_REPLY
    WAITING_DELAY
    COMPLETED
    FAILED
    CANCELLED
  }

  "One step on the canvas. data is the step kind's own settings, as JSON."
  type AutomationNode {
    id: ID!
    kind: String!
    x: Float!
    y: Float!
    data: String!
  }

  "One arrow. source_handle is the exit it leaves by — next for a single-exit step."
  type AutomationEdge {
    id: ID!
    source: ID!
    source_handle: String!
    target: ID!
  }

  "Something that stops the flow from running, tied to the step it is on when it is."
  type AutomationIssue {
    node_id: ID
    message: String!
  }

  """
  A flow the AI portal drew. The graph is stored as drawn; the server walks it
  when the trigger fires. issues is computed on every read, so the builder
  always shows what still has to be fixed before the flow can be activated.
  """
  type AutomationFlow {
    id: ID!
    name: String!
    description: String!
    channel: AutomationChannel!
    status: AutomationFlowStatus!
    nodes: [AutomationNode!]!
    edges: [AutomationEdge!]!
    "The trigger step's kind — INBOUND_MESSAGE, INBOUND_EMAIL or MANUAL; empty before one is set."
    trigger: String!
    issues: [AutomationIssue!]!
    "Live runs only — a test never counts."
    run_count: Int!
    last_run_at: String
    created_at: String
    updated_at: String
  }

  type AutomationContact {
    name: String!
    phone: String!
    email: String!
  }

  type AutomationStep {
    node_id: ID!
    kind: String!
    "OK, SKIPPED, FAILED or WAITING."
    status: String!
    detail: String!
    at: String!
  }

  "One line of a run's transcript: what came in, what went out, or a note."
  type AutomationMessage {
    id: ID!
    "IN, OUT or SYSTEM."
    direction: String!
    "text, whatsapp_template or email."
    kind: String!
    text: String!
    subject: String!
    html: String!
    template_name: String!
    buttons: [String!]!
    "False for a test preview that was never handed to a provider."
    delivered: Boolean!
    at: String!
  }

  "One walk of a flow for one contact."
  type AutomationRun {
    id: ID!
    flow_id: ID!
    flow_name: String!
    channel: AutomationChannel!
    mode: AutomationRunMode!
    deliver: Boolean!
    status: AutomationRunStatus!
    contact: AutomationContact!
    trigger_text: String!
    trigger_subject: String!
    variables_json: String!
    current_node_id: String!
    steps: [AutomationStep!]!
    messages: [AutomationMessage!]!
    error: String!
    started_at: String
    finished_at: String
    resume_at: String
    wait_until: String
  }

  "An SMTP mailbox from Tech > Environment, as a send step may pick it. Never a credential."
  type AutomationEmailSender {
    id: ID!
    name: String!
    from_address: String!
    is_default: Boolean!
  }

  "A template from Tech > Email Templates and the variables a send step must fill."
  type AutomationEmailTemplate {
    slug: String!
    name: String!
    subject: String!
    variables: [String!]!
  }

  "A Gmail mailbox connected in Tech > Mail Automation — what an incoming-email trigger listens on."
  type AutomationMailbox {
    email: String!
    display_name: String!
    is_active: Boolean!
  }

  type AutomationPromptOption {
    id: ID!
    name: String!
    category: String!
    kind: String!
  }

  """
  Everything the builder picks from, for one channel. The WhatsApp fields are
  empty on an email flow and vice versa, so one query serves both builders.
  """
  type AutomationOptions {
    channel: AutomationChannel!
    "Recipient variables read off the matching Duncit account, e.g. first_name."
    variables: [WaCampaignVariable!]!
    prompts: [AutomationPromptOption!]!
    whatsapp_configured: Boolean!
    project_configured: Boolean!
    campaigns: [AisensyCampaign!]!
    templates: [AisensyTemplate!]!
    saved_campaign_names: [WaCampaignNameOption!]!
    "Where AiSensy's incoming-message webhook must point."
    webhook_url: String!
    "Whether the AiSensy entry in Tech > Environment carries a Webhook Secret. Without one, incoming messages are refused."
    webhook_secret_set: Boolean!
    email_senders: [AutomationEmailSender!]!
    email_templates: [AutomationEmailTemplate!]!
    email_categories: [String!]!
    mailboxes: [AutomationMailbox!]!
  }

  input AutomationNodeInput {
    id: ID!
    kind: String!
    x: Float
    y: Float
    "The step's settings, as JSON."
    data: String
  }

  input AutomationEdgeInput {
    id: ID!
    source: ID!
    source_handle: String
    target: ID!
  }

  input SaveAutomationFlowInput {
    "Absent creates a flow; present updates it."
    id: ID
    name: String!
    description: String
    channel: AutomationChannel!
    nodes: [AutomationNodeInput!]!
    edges: [AutomationEdgeInput!]!
  }

  input AutomationContactInput {
    name: String!
    "WhatsApp flows: country code + number, digits only."
    phone: String
    "Email flows."
    email: String
  }

  "A test run. The graph is the one on the canvas, so an unsaved change is tested as drawn."
  input AutomationTestInput {
    flow_id: ID!
    nodes: [AutomationNodeInput!]!
    edges: [AutomationEdgeInput!]!
    contact: AutomationContactInput!
    "What the contact writes to start the flow."
    text: String
    subject: String
    "Send and call webhooks for real instead of previewing."
    deliver: Boolean
  }

  input AutomationTestReplyInput {
    run_id: ID!
    text: String
    "Take the No reply exit instead of answering."
    timed_out: Boolean
  }

  extend type Query {
    automationFlows(channel: AutomationChannel!): [AutomationFlow!]!
    automationFlow(id: ID!): AutomationFlow
    automationOptions(channel: AutomationChannel!): AutomationOptions!
    automationRuns(flow_id: ID!, mode: AutomationRunMode, limit: Int): [AutomationRun!]!
    automationRun(id: ID!): AutomationRun
  }

  extend type Mutation {
    "Create or update a flow. A draft may be incomplete; the returned issues say what is left."
    saveAutomationFlow(input: SaveAutomationFlowInput!): AutomationFlow!
    "Activating is refused while the flow has issues."
    setAutomationFlowStatus(id: ID!, status: AutomationFlowStatus!): AutomationFlow!
    deleteAutomationFlow(id: ID!): Boolean!
    duplicateAutomationFlow(id: ID!): AutomationFlow!
    "Start a test run from the test window. Returns the run with its transcript so far."
    startAutomationTest(input: AutomationTestInput!): AutomationRun!
    "Answer a test run that is waiting for the contact, or let it time out."
    resumeAutomationTest(input: AutomationTestReplyInput!): AutomationRun!
    "A live run for one contact, started by hand. Messages are really sent."
    startAutomationRun(flow_id: ID!, contact: AutomationContactInput!, text: String): AutomationRun!
    cancelAutomationRun(id: ID!): AutomationRun!
  }
`;
