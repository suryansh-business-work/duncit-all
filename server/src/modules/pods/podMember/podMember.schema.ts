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

  """
  One backout this booking raised, as Finance sees it. The backout_no is the
  DUN-BKO id — the same key the User Backout Refunds page lists, so a line on
  Pod History and a row on that page are provably the same request.
  """
  type PodMemberBackout {
    backout_no: String!
    status: BackoutStatus!
    "1-based attempt for this user on this pod (a pod allows a few)."
    attempt_no: Int!
    "Seats this request released. Fewer than seats_before means a PARTIAL backout."
    seats: Int!
    seats_before: Int!
    refund_amount: Float
    """
    Duncit Coins this release's share of the booking was paid with, before the
    deduction — the coin twin of payment_amount.
    """
    coins_paid: Float!
    """
    Coins handed back, after the SAME Backouts deduction the cash refund takes
    (Finance > Default Deductions). Credited to the balance at the moment the
    cash refund is processed, never before.
    """
    coins_refunded: Float!
    """
    What Finance shows for THIS request. The booking's own refund_status is not
    it: the server never writes that one for a partial backout, so a member paid
    back for one of three seats was reading "not started".
    """
    refund_status: RefundStatus!
    deduction_pct: Float!
    "Set once Finance has processed it — before that the refund is only pending."
    refund_processed_at: String
    created_at: String!
    events: [PodMemberBackoutEvent!]!
  }

  type PodMemberBackoutEvent {
    status: BackoutStatus!
    at: String!
  }

  "Who ended the pod, when it was not the member who left."
  enum PodMemberCancelActor {
    HOST
    VENUE
    CLUB_ADMIN
    ADMIN
    SYSTEM
  }

  """
  One booking's whole story, in the shape the participation timeline reads.

  Finance and Admin resolve the same object the member's own Pod History does,
  so a support conversation is about one account of what happened rather than
  two. The pod's date is not on it: every screen that draws this already has
  the pod loaded, and it is the pod that says whether the story is still ahead.
  """
  type PodParticipation {
    joined_at: String!
    "True once a host has scanned this booking in at the door."
    attended: Boolean!
    attended_at: String
    """
    False when NOBODY on the pod was scanned — a virtual pod, or a host who
    never opened the scanner. Not attending and nobody checking are different
    things, and only one of them is this person's doing.
    """
    attendance_recorded: Boolean!
    "Set only when the pod itself was cancelled — then nothing else applies."
    pod_cancelled_by: PodMemberCancelActor
    pod_cancelled_at: String
    """
    What the cancellation did to this booking's money. Not every cancel path
    refunds, and a free booking has nothing to give back.
    """
    cancel_refund_status: RefundStatus!
    "Every backout this booking raised, oldest first."
    backouts: [PodMemberBackout!]!
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
    """
    This booking's whole story — backouts, attendance and cancellation in one
    object, so a timeline costs one resolution rather than five. Null to anyone
    but the member themselves and Admin/Finance: it carries DUN-BKO ids and
    refund amounts, and PodMember is reachable from unauthenticated queries.
    """
    participation: PodParticipation
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
    """
    Refund after deduction for ONE seat, so a partial backout can be priced for
    any number the buyer picks without another round trip. Null for a free join.
    """
    backout_refund_per_seat: Float
    """
    Coins the caller would get back if they released everything they hold —
    their share of what the booking was paid in coins, less the same Backouts
    deduction. 0 when the booking spent no coins.
    """
    backout_refund_coins: Float!
    """
    Seats the caller has already released and is still waiting to have filled.
    A partial release leaves the member JOINED, so this is the only signal that
    a Keep My Spot is available to them.
    """
    released_seats_pending: Int!
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
    "Seats this request released. Finance refunds these, not the whole booking."
    seats: Int!
    "Seats the booking held before this request — fewer released means a partial backout."
    seats_before: Int!
    "True when the member gave back only part of their booking and is still attending."
    is_partial: Boolean!
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
    """
    Duncit Coins this release's share of the booking was paid with, before the
    deduction — the coin twin of payment_amount.
    """
    coins_paid: Float!
    """
    Coins handed back, after the SAME Backouts deduction the cash refund takes
    (Finance > Default Deductions). Credited to the balance at the moment the
    cash refund is processed, never before.
    """
    coins_refunded: Float!
    "Set once Finance processed the refund (one refund per request)."
    refund_processed_at: String
    "Immutable, chronological Backout lifecycle timeline."
    events: [BackoutEvent!]!
    """
    The whole booking this request belongs to, so Finance reads the same story
    the member reads — this request is one branch of it, found by backout_no.
    """
    participation: PodParticipation
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
    "This person's own story on the pod. Null for a host seat with no booking."
    participation: PodParticipation
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
    """
    Confirm Backout — the released seats go back on sale immediately and the
    refund becomes eligible only once a replacement takes them.

    Omit the seats argument (or pass the whole booking) for the original
    all-or-nothing backout. Pass fewer to give back PART of a multi-seat
    booking: the member stays in the pod with the seats they kept, and only the
    released ones are refunded, at the same deduction.
    """
    backoutPod(pod_doc_id: ID!, seats: Int): PodMember!
    "Keep My Spot — cancel an in-process backout and restore the booking (seat must still be free)."
    cancelBackoutPod(pod_doc_id: ID!, backout_id: ID): PodMember!
    redeemPodReferral(token: String!): PodMember!
    "Rejoin a pod the caller previously backed out of — no payment, until the pod completes."
    rejoinPod(pod_doc_id: ID!): PodMember!
    "Finance-only: process the refund for a Spot Filled Backout request (one refund per request)."
    processBackoutRefund(id: ID!): BackoutRefundRequest!
  }
`;
