export const podMemberTypeDefs = /* GraphQL */ `
  enum MembershipStatus {
    JOINED
    BACKOUT_IN_PROCESS
    BACKED_OUT
  }

  "Lifecycle of a single Backout request (one per Confirm Backout)."
  enum BackoutStatus {
    IN_PROCESS
    CANCELLED
    SPOT_FILLED
  }

  enum RefundStatus {
    NONE
    PENDING
    PROCESSED
    NOT_ELIGIBLE
  }

  enum JoinSource {
    DIRECT
    REFERRAL
    PAID
    FREE
    HOST_ADD
  }

  type PodMember {
    id: ID!
    pod_id: ID!
    pod: Pod
    user_id: ID!
    status: MembershipStatus!
    "Seats this booking holds — one ticket admits this many. 1 for every legacy booking."
    seats: Int!
    """
    The other people this booking admits, captured at check-in. Empty until the
    host scans the ticket; one entry per seat beyond the buyer's own afterwards.
    """
    companions: [PodCompanion!]!
    joined_at: String!
    backed_out_at: String
    payment_id: ID
    source: JoinSource!
    referral_token: String
    referred_by: ID
    refund_status: RefundStatus!
    refund_payment_id: ID
    "Backout attempts used for this pod (each Confirm Backout counts one)."
    backout_count: Int!
    created_at: String!
    updated_at: String!
  }

  type PodMembershipState {
    pod_id: ID!
    is_member: Boolean!
    status: MembershipStatus
    membership: PodMember
    spots_taken: Int!
    spots_total: Int!
    "Seats still bookable (0 when the pod has unlimited spots)."
    seats_available: Int!
    "Most seats one booking may take — caps the Pod Details seat picker."
    max_seats_per_booking: Int!
    "Seats the caller already holds on this pod (0 when not a member)."
    my_seats: Int!
    can_backout: Boolean!
    can_join: Boolean!
    refund_threshold_pct: Int!
    "True while the caller's booking is in 'Backout in process'."
    backout_in_process: Boolean!
    "True when the in-process backout can still be cancelled (seat not rebooked)."
    can_cancel_backout: Boolean!
    "Backout attempts the caller has used for this pod."
    backout_attempts_used: Int!
    "Max Backout attempts per user per pod (Admin > Pods > Pod Settings)."
    backout_attempts_max: Int!
    "Global Backouts deduction % applied to a backout refund."
    backout_deduction_pct: Float!
    "Estimated refund after deduction for the caller's paid booking (null for free)."
    backout_refund_amount: Float
  }

  "One recorded Backout lifecycle event (immutable, chronological)."
  type BackoutEvent {
    status: BackoutStatus!
    "The user's backout-attempt count for this pod when the event happened."
    backout_count: Int!
    at: String!
  }

  "A Backout request — powers the Finance 'Backout Refunds' list + detail."
  type BackoutRefundRequest {
    id: ID!
    "Permanent, globally unique Backout ID (DUN-BKO-000001)."
    backout_no: String!
    pod_id: ID!
    pod: Pod
    user_id: ID!
    user_name: String
    user_email: String
    "Contact number of the member being refunded (null when none is on file)."
    user_phone: String
    status: MembershipStatus!
    "Lifecycle status of this Backout request."
    backout_status: BackoutStatus!
    "1-based backout attempt this request represents for the user+pod."
    attempt_no: Int!
    "Backout attempts the user has used for this pod so far."
    backout_attempts_used: Int!
    "Max Backout attempts per user per pod (Admin > Pods > Pod Settings)."
    max_backout_attempts: Int!
    "True once a replacement booked the released seat (Spot Filled)."
    replacement_confirmed: Boolean!
    """
    The member whose join closed this request. Null while the request is open
    and on requests filled before this was recorded.
    """
    replacement_user_id: ID
    replacement_user_name: String
    replacement_user_email: String
    joined_at: String!
    backed_out_at: String
    refund_status: RefundStatus!
    payment_id: ID
    payment_amount: Float
    payment_currency: String
    payment_status: String
    "Backouts deduction % snapshotted when the request was created."
    deduction_pct: Float!
    "Estimated refund after deduction (null for free bookings)."
    refund_amount: Float
    "Set once Finance processed the refund (one refund per request)."
    refund_processed_at: String
    "Immutable, chronological Backout lifecycle timeline."
    events: [BackoutEvent!]!
    refund_threshold_pct: Int!
    created_at: String!
  }

  "One filled Backout seat on a pod — who released the spot and who took it."
  type PodSpotFill {
    "Permanent Backout ID of the filled request (DUN-BKO-000001)."
    backout_no: String!
    backed_out_user_id: ID!
    backed_out_user_name: String
    backed_out_profile_photo: String
    "Null on requests filled before the replacement was recorded."
    replacement_user_id: ID
    replacement_user_name: String
    replacement_profile_photo: String
    filled_at: String!
  }

  "How many seats one JOINED member holds — the +N other members label."
  type PodAttendeeSeats {
    user_id: ID!
    "Seats this person's booking holds (always at least 1)."
    seats: Int!
  }

  "Admin/Finance: one person on a pod — host, attendee or backed-out member."
  type AdminPodAttendee {
    "PodMember row id — null for people without a membership row (host seat)."
    member_id: ID
    "Seats this booking holds — one ticket admits this many. 1 for a legacy booking."
    seats: Int!
    "The other people on this booking, recorded at the door."
    companions: [PodCompanion!]!
    user_id: ID!
    full_name: String
    email: String
    phone: String
    profile_photo: String
    is_host: Boolean!
    "Null for people without a membership row (the host's own free seat)."
    status: MembershipStatus
    joined_at: String
    backed_out_at: String
    source: JoinSource
    refund_status: RefundStatus
    payment_id: ID
    "Backout ID of the filled request when this member's seat was rebooked."
    backout_no: String
    "Set when this member backed out and a replacement filled the seat."
    replaced_by_user_id: ID
    replaced_by_name: String
  }

  "One booking resolved from a booking deep link (the receipt email's View Booking CTA)."
  type BookingDetail {
    "PodMember id — the booking identifier carried in the deep link."
    id: ID!
    pod_id: ID!
    "Club slug — first path segment of the canonical pod URL."
    club_slug: String!
    "Pod slug — second path segment of the canonical pod URL."
    pod_slug: String!
    pod_title: String!
    pod_date_time: String
    status: MembershipStatus!
    joined_at: String!
    payment_id: ID
  }

  "Server-side table page for the shared table engine (backoutRefundRequestsTable)."
  type BackoutRefundRequestTablePage {
    rows: [BackoutRefundRequest!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    myPodMemberships(status: MembershipStatus): [PodMember!]!
    podMembershipState(pod_doc_id: ID!): PodMembershipState!
    podMembers(pod_doc_id: ID!, status: MembershipStatus): [PodMember!]!
    """
    Seats each JOINED member of a pod holds. Powers the "+N other members" label
    on the attendee list — one face per person, the group size beside their name.
    """
    podAttendeeSeats(pod_doc_id: ID!): [PodAttendeeSeats!]!
    "Every filled Backout seat of a pod — struck-through attendee rows (public)."
    podSpotFills(pod_doc_id: ID!): [PodSpotFill!]!
    "Admin/Finance: everyone on a pod with contact info and replacement links."
    adminPodAttendees(pod_doc_id: ID!): [AdminPodAttendee!]!
    referralLookup(token: String!): PodMember
    "Resolve a booking deep link. Only the user who owns the booking may read it."
    bookingDetail(booking_id: ID!): BookingDetail!
    "Finance-only: every Backout request ever raised (all statuses, for audit)."
    backoutRefundRequests: [BackoutRefundRequest!]!
    backoutRefundRequestsTable(query: TableQueryInput): BackoutRefundRequestTablePage!
    backoutRefundRequest(id: ID!): BackoutRefundRequest
  }

  extend type Mutation {
    "Book a free pod. Seats books several at once (default 1, capped by what is left)."
    joinFreePod(pod_doc_id: ID!, referral_token: String, seats: Int): PodMember!
    "Confirm Backout — booking moves to 'Backout in process' and the seat is released."
    backoutPod(pod_doc_id: ID!): PodMember!
    "Keep My Spot — cancel an in-process backout and restore the booking (seat must still be free)."
    cancelBackoutPod(pod_doc_id: ID!): PodMember!
    redeemPodReferral(token: String!): PodMember!
    "Rejoin a pod the caller previously backed out of — no payment, until the pod completes."
    rejoinPod(pod_doc_id: ID!): PodMember!
    "Finance-only: process the refund for a Spot Filled Backout request (one refund per request)."
    processBackoutRefund(id: ID!): BackoutRefundRequest!
  }
`;
