export const ticketTypeDefs = /* GraphQL */ `
  enum TicketStatus {
    OPEN
    PENDING
    RESOLVED
    CLOSED
  }

  enum TicketPriority {
    LOW
    MEDIUM
    HIGH
  }

  enum TicketCategory {
    GENERAL
    PAYMENT
    BOOKING
    SAFETY
    TECHNICAL
    OTHER
  }

  enum TicketAuthorRole {
    USER
    AGENT
    "Automated timeline entry (resolve / reopen), no human author."
    SYSTEM
  }

  type TicketActor {
    id: ID!
    name: String!
    email: String
    phone: String
    avatar_url: String
    city: String
    state: String
    country: String
    "When the user joined Duncit (ISO)."
    joined_at: String
    is_email_verified: Boolean!
    is_phone_verified: Boolean!
  }

  type TicketMessage {
    id: ID!
    author_id: ID!
    author_role: TicketAuthorRole!
    author_name: String!
    author_photo: String
    body_html: String!
    body_text: String!
    attachments: [String!]!
    created_at: String!
  }

  type Ticket {
    id: ID!
    "Human-readable support ticket number, e.g. ST-A1B2C3 (derived from the id)."
    ticket_no: String!
    user: TicketActor!
    subject: String!
    category: TicketCategory!
    "The pod this ticket is about, if it was raised from a pod."
    pod_id: ID
    pod_title: String!
    status: TicketStatus!
    priority: TicketPriority!
    assignee_id: ID
    assignee_name: String
    last_message_at: String!
    "When the ticket was resolved/closed (drives the reopen window)."
    resolved_at: String
    "Reopen is allowed by the user until this instant (null if not resolved/closed)."
    reopen_deadline: String
    "Satisfaction rating (1-5) left by the owner after resolution; null if none."
    rating: Int
    feedback_comment: String
    feedback_at: String
    "When each side last opened the thread — drives the Sent/Seen ticks (B12)."
    user_last_read_at: String
    agent_last_read_at: String
    message_count: Int!
    messages: [TicketMessage!]!
    created_at: String!
    updated_at: String!
  }

  input CreateTicketInput {
    subject: String!
    category: TicketCategory
    body_html: String
    body_text: String!
    attachments: [String!]
    "Attach the pod this ticket is about (from Contact Support on a pod)."
    pod_id: ID
    pod_title: String
  }

  "A page of tickets for the agent list (server-side pagination + sort + search)."
  type TicketPage {
    items: [Ticket!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    tickets(
      status: TicketStatus
      assignee_id: ID
      search: String
      page: Int
      page_size: Int
      sort_by: String
      sort_dir: String
      "When set, tickets of this priority list first (display order only — priorities are never modified)."
      priority_first: TicketPriority
    ): TicketPage!
    ticket(id: ID!): Ticket
    myTickets: [Ticket!]!
    "Transcript of a ticket (.txt or .docx) — accessible to its owner or a support agent."
    ticketTranscript(ticket_id: ID!, format: TranscriptFormat): SupportChatTranscript!
  }

  extend type Mutation {
    createTicket(input: CreateTicketInput!): Ticket!
    replyToTicket(
      ticket_id: ID!
      body_html: String
      body_text: String!
      attachments: [String!]
    ): Ticket!
    updateTicketStatus(ticket_id: ID!, status: TicketStatus!): Ticket!
    "Set a ticket's priority flag (High/Medium/Low) — support agents only."
    updateTicketPriority(ticket_id: ID!, priority: TicketPriority!): Ticket!
    "Mark a ticket thread read (owner or agent) — updates the side's last-read so the other side's ticks turn 'Seen' (B12)."
    markTicketRead(ticket_id: ID!): Ticket!
    "Re-open a resolved/closed ticket (owner within 3 days, or an agent). Reason logged to the thread."
    reopenTicket(ticket_id: ID!, reason: String): Ticket!
    "Mark a ticket resolved (owner OR an agent) — appends a SYSTEM timeline bubble."
    resolveTicket(ticket_id: ID!): Ticket!
    "Leave a 1-5 satisfaction rating + optional comment on a resolved/closed ticket (owner-only, one-time)."
    submitTicketFeedback(ticket_id: ID!, rating: Int!, comment: String): Ticket!
    assignTicket(ticket_id: ID!, assignee_id: ID): Ticket!
    "Email the ticket transcript to an address (defaults to a .docx attachment)."
    emailTicketTranscript(ticket_id: ID!, email: String!, format: TranscriptFormat): Boolean!
  }
`;
