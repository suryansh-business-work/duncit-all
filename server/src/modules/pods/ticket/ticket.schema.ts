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
    "When their own number answered a one-time code (ISO). Null when the host recorded them without one."
    verified_at: String
    "The channel that carried the code they answered — blank when none did."
    verified_medium: String!
  }

  "Details for one of the other people a multi-seat ticket admits."
  input PodCompanionInput {
    name: String!
    phone_extension: String
    phone_number: String!
    """
    A verified requestPodCompanionOtp challenge for THIS number, when the
    host proved it at the door.

    Optional on purpose: a dead phone or a number abroad must never hold a
    group at the door. When it is sent the server spends it, so one proof can
    never be replayed across the rest of the group.
    """
    otp_challenge_id: ID
  }

  """
  One of the extra people a booking admits, as a Club Admin is given them.

  Separate from PodCompanionInput because the two are collected in different
  rooms. At the door the host has the group in front of them, so a number is
  reasonable. A Club Admin correcting a roster the host forgot is read names
  down a phone line, and demanding a number there means ringing every attendee
  — the exact call this path exists to avoid. So the name is required and
  nothing else is.
  """
  input PodForcedCompanionInput {
    name: String!
    phone_extension: String
    phone_number: String
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
    """
    Club Admin marks a member present without a scan — by code, or by name.

    The host's own path is proof-first: a QR scan, or a one-time code the
    attendee reads back, and the host is paid on the result. This is the club's
    override for when neither can be produced, and it carries both doors:

    - Send the attendee a WhatsApp/SMS code with requestPodAttendanceOtp, verify
      it, and pass the challenge as otp_challenge_id. It is spent here and the
      number that answered is recorded against the ticket.
    - Or pass none: the host forgot to mark the pod and read the admin the
      names, which is the call this path exists for. The companions argument
      records whichever of them a multi-seat booking was given.

    Neither door is gated on the companion count, unlike the host's scan — the
    group is not standing at this one. Every mark records who made it and
    notifies the member, so it is contestable rather than silent.
    """
    clubAdminForceAttendance(
      pod_doc_id: ID!
      membership_id: ID!
      "A verified requestPodAttendanceOtp challenge for this booking, when the admin took the code route."
      otp_challenge_id: ID
      "Names for the other people a multi-seat booking admits, as far as they are known."
      companions: [PodForcedCompanionInput!]
    ): EventTicket!
  }
`;
