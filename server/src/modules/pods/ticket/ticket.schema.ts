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

  """
  Who the host just scanned in. Everything the attendee has on file that helps a
  host recognise and reach them at the door — blank strings where they have not
  filled a field, so the client renders only what exists.
  """
  type ScannedAttendee {
    user_id: ID!
    full_name: String!
    profile_photo: String!
    "App path to their public profile (/u/<id>), so each surface builds its own link."
    profile_path: String!
    email: String!
    phone: String!
    whatsapp: String!
    bio: String!
    "Single-line postal address, already joined server-side."
    address: String!
    city: String!
    "When they joined this pod (ISO), from their membership."
    joined_at: String
  }

  type HostTicketScanResult {
    ok: Boolean!
    message: String!
    "True when the ticket had already been checked in before this scan."
    already_checked_in: Boolean!
    ticket: EventTicket
    attendee: ScannedAttendee
  }

  "Server-side table page for the shared table engine (eventTicketsTable)."
  type EventTicketTablePage {
    rows: [EventTicket!]!
    total: Int!
    page: Int!
    page_size: Int!
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
    eventTicketsTable(query: TableQueryInput): EventTicketTablePage!
    eventTicket(id: ID!): EventTicket
  }

  extend type Mutation {
    verifyEventTicketQr(token: String!): EventTicketVerifyResult!
    checkInEventTicket(input: CheckInEventTicketInput!): EventTicket!
    """
    Host scans an attendee's ticket QR for one of their OWN pods: verifies the
    code belongs to that pod, marks attendance and returns the attendee.
    Authorised by the same host/co-host rule as hostUpdatePod — a host never
    holds an admin role, so the admin check-in mutations are closed to them.
    """
    hostScanPodTicket(pod_doc_id: ID!, token: String!): HostTicketScanResult!
  }
`;
