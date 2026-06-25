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
  }

  type TicketActor {
    id: ID!
    name: String!
    phone: String
    avatar_url: String
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
    user: TicketActor!
    subject: String!
    category: TicketCategory!
    status: TicketStatus!
    priority: TicketPriority!
    assignee_id: ID
    assignee_name: String
    last_message_at: String!
    "When the ticket was resolved/closed (drives the reopen window)."
    resolved_at: String
    "Reopen is allowed by the user until this instant (null if not resolved/closed)."
    reopen_deadline: String
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
  }

  extend type Query {
    tickets(status: TicketStatus, assignee_id: ID, search: String, limit: Int): [Ticket!]!
    ticket(id: ID!): Ticket
    myTickets: [Ticket!]!
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
    "Re-open a resolved/closed ticket (owner within 3 days, or an agent). Reason logged to the thread."
    reopenTicket(ticket_id: ID!, reason: String): Ticket!
    assignTicket(ticket_id: ID!, assignee_id: ID): Ticket!
  }
`;
