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
    "People this ticket admits (its booking's seats). 1 for every legacy ticket."
    seats: Int!
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

  "One extra person admitted on someone else's booking, recorded at the door."
  type PodCompanion {
    name: String!
    phone_extension: String
    phone_number: String!
    "When the host recorded them (ISO)."
    added_at: String!
  }

  "Details for one of the other people a multi-seat ticket admits."
  input PodCompanionInput {
    name: String!
    phone_extension: String
    phone_number: String!
  }

  type HostTicketScanResult {
    ok: Boolean!
    message: String!
    "True when the ticket had already been checked in before this scan."
    already_checked_in: Boolean!
    """
    True when this ticket admits more people than the buyer and their details
    have not been recorded yet. The ticket is NOT checked in — scan again with
    the companions argument filled to mark the group present.
    """
    requires_companions: Boolean!
    "How many more people still need a name and phone number (0 when none do)."
    companions_required: Int!
    "The other people on this booking, once recorded."
    companions: [PodCompanion!]!
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
    """
    The other people this ticket admits. Required the first time a multi-seat
    ticket is checked in — exactly one entry per seat beyond the buyer's own.
    """
    companions: [PodCompanionInput!]
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
    hostScanPodTicket(
      pod_doc_id: ID!
      token: String!
      "Details for the other people the ticket admits — send on the second scan."
      companions: [PodCompanionInput!]
    ): HostTicketScanResult!
  }
`;
