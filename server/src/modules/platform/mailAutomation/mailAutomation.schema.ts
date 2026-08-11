export const mailAutomationTypeDefs = /* GraphQL */ `
  """
  Which queue an inbound email opens a record in. Chosen per mailbox in the
  Support portal — step 3 of the wizard.
  """
  enum MailTicketType {
    "A support ticket, the ordinary conversation queue."
    SUPPORT
    "A grievance — a legal filing with a redressal clock on it."
    GRIEVANCE
    "A Report a Problem entry, triaged like an in-app bug report."
    REPORT_PROBLEM
  }

  """
  A Gmail mailbox that answers itself.

  Connected in the Tech portal (credentials), governed from the Support portal
  (what it says and what it opens). The first message on a conversation gets a
  ticket and one acknowledgement; every reply after that on the same thread is
  left alone for a human.
  """
  type MailAutomationAccount {
    id: ID!
    "The connected mailbox address."
    email: String!
    display_name: String!
    "Whether the automation is running for this mailbox. Pausing is not disconnecting."
    is_active: Boolean!
    "Step 2 — what every first message gets back. Must contain {{ticket_no}}."
    reply_template: String!
    "Let OpenAI rewrite the template into a reply to the actual email, at send time."
    ai_enabled: Boolean!
    ticket_type: MailTicketType!
    sla_min_hours: Int!
    sla_max_hours: Int!
    "The response window as the reply words it — for example, 24-48 hours."
    sla_label: String!
    "False once the Google grant is gone — reconnect from the Tech portal."
    is_connected: Boolean!
    last_polled_at: String
    "Why the last poll failed, or '' when it did not."
    last_error: String!
    connected_at: String!
  }

  "One conversation the automation has already answered."
  type MailAutomationThread {
    id: ID!
    from_email: String!
    from_name: String!
    subject: String!
    ticket_type: MailTicketType!
    "The reference quoted back to the sender, e.g. ST-A1B2C3 or GRV-000012."
    ticket_no: String!
    "When the acknowledgement went out. Null means the ticket exists but the reply did not send."
    replied_at: String
    reply_error: String!
    "True when OpenAI wrote the body; false when the operator's template went as written."
    reply_by_ai: Boolean!
    created_at: String!
  }

  "What a sender would actually receive, composed from the saved rule."
  type MailAutomationPreview {
    text: String!
    by_ai: Boolean!
  }

  input MailAutomationRuleInput {
    id: ID!
    reply_template: String
    ai_enabled: Boolean
    ticket_type: MailTicketType
    sla_min_hours: Int
    sla_max_hours: Int
    "Pause or resume the automation without giving up the Google grant."
    is_active: Boolean
  }

  extend type Query {
    "Whether a Google OAuth client is configured to connect a mailbox with."
    mailAutomationConfigured: Boolean!
    "Every connected mailbox. Read by both the Tech and Support portals."
    mailAutomationAccounts: [MailAutomationAccount!]!
    "Recent conversations this mailbox answered — the audit trail for the rule."
    mailAutomationThreads(account_id: ID!, limit: Int): [MailAutomationThread!]!
    """
    Read the reply back before saving. Takes the same input as the save and
    applies it to an unsaved copy, so the preview answers "what does the
    message I just typed do" rather than "what did the last saved one do".
    """
    mailAutomationPreview(input: MailAutomationRuleInput!): MailAutomationPreview!
  }

  extend type Mutation {
    """
    Tech portal only: the Google consent URL to open in a new tab. The callback
    at /gmail/oauth/callback finishes the connection and returns the operator
    to the Tech portal.
    """
    mailAutomationConnectUrl(login_hint: String): String!
    "Tech portal only: forget the mailbox. Tickets it already opened stay."
    disconnectMailAutomationAccount(id: ID!): Boolean!
    "Support portal: steps 2 and 3 — the reply message, the queue and the window."
    updateMailAutomationRule(input: MailAutomationRuleInput!): MailAutomationAccount!
  }
`;
