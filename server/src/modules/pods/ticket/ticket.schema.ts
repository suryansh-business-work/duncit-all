export const eventTicketTypeDefs = /* GraphQL */ `
  enum EventTicketStatus {
    VALID
    CHECKED_IN
    CANCELLED
  }

  type EventTicket {
    id: ID!
    ticket_code: String!
    membership_id: ID!
    pod_id: ID!
    user_id: ID!
    payment_id: ID
    status: EventTicketStatus!
    checked_in_at: String
    qr_token: String!
    pod_title: String!
    pod_date_time: String
    pod_end_date_time: String
    pod_mode: String!
    meeting_platform: String
    venue_name: String
    venue_address: String
    zone_name: String
    user_name: String!
    user_email: String!
    created_at: String!
    updated_at: String!
  }

  type EventTicketVerifyResult {
    ok: Boolean!
    message: String!
    ticket: EventTicket
  }

  input EventTicketFilterInput {
    pod_id: ID
    status: EventTicketStatus
    search: String
  }

  input CheckInEventTicketInput {
    token: String
    ticket_doc_id: ID
  }

  extend type Query {
    myEventTickets: [EventTicket!]!
    myEventTicketForPod(pod_doc_id: ID!): EventTicket
    eventTicketPdfBase64(ticket_doc_id: ID!): String!
    eventTickets(filter: EventTicketFilterInput): [EventTicket!]!
    eventTicket(id: ID!): EventTicket
  }

  extend type Mutation {
    verifyEventTicketQr(token: String!): EventTicketVerifyResult!
    checkInEventTicket(input: CheckInEventTicketInput!): EventTicket!
  }
`;
