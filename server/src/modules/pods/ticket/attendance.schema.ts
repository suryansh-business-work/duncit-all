export const podAttendanceTypeDefs = /* GraphQL */ `
  "Which capacity the signed-in person is reading this roster in."
  enum PodAttendanceViewer {
    "The pod's host or co-host. Paid on the result, so their by-hand mark is gated."
    HOST
    "An admin of the club the pod belongs to. Their mark is the override."
    CLUB_ADMIN
  }

  "How a booking came to be marked present."
  enum AttendanceMarkMethod {
    "Their ticket QR was scanned at the door — proof they were there."
    HOST_SCAN
    "The host marked them by hand, after verifying their name and number."
    HOST_MANUAL
    "A Club Admin forced it without a scan."
    CLUB_ADMIN_FORCE
    "A Duncit admin checked the ticket in."
    ADMIN
    "They opened a virtual pod's meeting link as a joined member, inside the pod window — the online equivalent of the door scan."
    VIRTUAL_JOIN
  }

  """
  Why the roster can no longer be changed.

  Completion is the real deadline: it computes the payout from exactly who is
  marked and hands the releases to Finance, so a late mark would claim money
  that was already split.
  """
  enum PodAttendanceLock {
    OPEN
    COMPLETED
    CANCELLED
  }

  type PodAttendanceCompanion {
    name: String!
    phone_extension: String!
    phone_number: String!
    added_at: String!
  }

  "Who to ask when attendance can no longer be marked."
  type PodAttendanceClubAdmin {
    id: ID!
    name: String!
    avatar_url: String!
    email: String!
    phone: String!
    whatsapp: String!
  }

  "One booking on the roster."
  type PodAttendanceRow {
    membership_id: ID!
    user_id: ID!
    ticket_id: ID
    ticket_code: String!
    name: String!
    avatar_url: String!
    email: String!
    "The number on their account, so the host confirms rather than retypes it."
    phone_extension: String!
    phone_number: String!
    "People this one booking admits."
    seats: Int!
    attended: Boolean!
    attended_at: String
    marked_method: AttendanceMarkMethod
    "Who marked them, named. Blank when nobody has."
    marked_by_name: String!
    "The number that answered the one-time code. Blank when none was required."
    verified_phone: String!
    companions: [PodAttendanceCompanion!]!
    "How many of this booking's extra people still need a name and number."
    companions_required: Int!
  }

  """
  Everything the attendance page draws, in one read.

  The host's page and the Club Admin's section render the SAME board — two
  queries would be two places for "is this person marked" to disagree.
  """
  type PodAttendanceBoard {
    pod_id: ID!
    pod_title: String!
    pod_date_time: String
    pod_end_date_time: String
    "PHYSICAL or VIRTUAL. A virtual pod has no door to scan at: a member is marked when they open the meeting link."
    pod_mode: PodMode!
    viewer: PodAttendanceViewer!
    lock: PodAttendanceLock!
    "False once the pod is completed or cancelled — nothing can be marked then."
    can_mark: Boolean!
    "Whether a by-hand mark must be preceded by a verified one-time code."
    otp_required: Boolean!
    marked_count: Int!
    total_count: Int!
    marked_seats: Int!
    total_seats: Int!
    rows: [PodAttendanceRow!]!
    "The club's admins — the people to ask once the roster is locked."
    club_admins: [PodAttendanceClubAdmin!]!
  }

  input PodAttendanceOtpInput {
    pod_doc_id: ID!
    membership_id: ID!
    "The name being proven alongside the number."
    name: String!
    phone_extension: String!
    phone_number: String!
    "SMS, WhatsApp, or both. The medium is an argument to one shared service."
    mediums: [OtpMedium!]!
  }

  extend type Query {
    """
    The pod's attendance roster. Readable by the pod's host/co-host and by an
    admin of the club it belongs to; nobody else.
    """
    podAttendanceBoard(pod_doc_id: ID!): PodAttendanceBoard!
  }

  """
  What a joined member gets back when they open a virtual pod's meeting.

  The link itself is also readable on the Pod (gated to joined members), so
  this is not the only way to see it — it is the way that COUNTS: opening it
  through here, inside the pod window, marks the booking present.
  """
  type PodMeetingAccess {
    meeting_url: String!
    meeting_notes: String
    "True when this open marked the booking present (or it already was)."
    attendance_marked: Boolean!
  }

  extend type Mutation {
    """
    Open a virtual pod's meeting as a joined member.

    Returns the link, and — inside the pod window (from an hour before the
    start to an hour after the end) — marks the booking present through the
    same write every other attendance path uses, as VIRTUAL_JOIN. A host
    opening their own pod's link is handed the link and marks nothing: hosts
    are never attendees of their own pod.
    """
    joinPodMeeting(pod_doc_id: ID!): PodMeetingAccess!
    "Send the attendee a one-time code over the chosen medium(s)."
    requestPodAttendanceOtp(input: PodAttendanceOtpInput!): PhoneOtpRequestResult!
    """
    Send ONE of the extra people a multi-seat booking admits a one-time code.

    The same input and the same shared OTP service as the attendee's own code,
    with the name and the number being the companion's rather than the buyer's.
    A separate purpose, so a companion's proof can never be spent as the
    buyer's attendance. Spending it happens when the group is recorded, which
    is why the host verifies them one at a time.
    """
    requestPodCompanionOtp(input: PodAttendanceOtpInput!): PhoneOtpRequestResult!
    """
    Check a code that was read out — the attendee's own, or a companion's.

    Purpose-agnostic on purpose: verifying grants nothing by itself, and the
    step that SPENDS the proof (the mark, or the door's companion record)
    re-checks the purpose, the booking and the number it was raised for.
    """
    verifyPodAttendanceOtp(challenge_id: ID!, otp: String!): Boolean!
    """
    Host marks one attendee present without a scan.

    While Admin > Pods > Pod Settings requires OTP, \`otp_challenge_id\` must
    name a verified challenge raised for THIS booking — one proof marks one
    person. Returns the whole board so the page never has to guess what the
    write did to the counts.
    """
    hostMarkPodAttendance(
      pod_doc_id: ID!
      membership_id: ID!
      otp_challenge_id: ID
    ): PodAttendanceBoard!
  }
`;
