export const clubAdminTypeDefs = /* GraphQL */ `
  "Headline metrics for a Club Admin across all their assigned clubs."
  type ClubAdminKpis {
    assigned_clubs: Int!
    total_pods: Int!
    upcoming_pods: Int!
    completed_pods: Int!
    "Confirmed bookings (JOINED memberships) across the clubs' pods."
    total_bookings: Int!
    "Backed-out memberships across the clubs' pods."
    backed_out: Int!
    total_attendees: Int!
    total_spots: Int!
    "Occupancy: attendees / spots (0..1)."
    fill_rate: Float!
    total_followers: Int!
    "New followers within the selected date range."
    new_followers: Int!
    avg_rating: Float!
    ratings_count: Int!
    "Distinct hosts running pods across the clubs."
    active_hosts: Int!
    "Total collected from SUCCESS payments on the clubs' pods."
    total_revenue: Float!
    currency_symbol: String!
  }

  "One month of the dashboard trend chart."
  type ClubAdminTrendPoint {
    label: String!
    pods: Int!
    bookings: Int!
    followers: Int!
    revenue: Float!
  }

  "Per-club breakdown row on the Club Admin dashboard."
  type ClubAdminClubRow {
    club_id: ID!
    club_slug: String!
    club_name: String!
    total_pods: Int!
    upcoming_pods: Int!
    completed_pods: Int!
    followers: Int!
    rating: Float!
    revenue: Float!
  }

  "Server-side table page for the shared table engine (clubAdminDashboardTable)."
  type ClubAdminClubRowTablePage {
    rows: [ClubAdminClubRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type ClubAdminDashboard {
    kpis: ClubAdminKpis!
    trend: [ClubAdminTrendPoint!]!
    clubs: [ClubAdminClubRow!]!
  }

  "Search + category + pagination filter for the Club Admin 'Your Clubs' list."
  input MyAdminClubsFilter {
    "Matches club name or slug (case-insensitive)."
    search: String
    super_category_id: ID
    "Middle category — matches clubs whose sub-category sits under it."
    category_id: ID
    sub_category_id: ID
    limit: Int
    offset: Int
  }

  type ClubAdminClubsPage {
    items: [Club!]!
    total: Int!
  }

  "Max-info per-club row for the Club Admin 'Your Clubs' table (myAdminClubsTable)."
  type ClubAdminClubInfoRow {
    id: ID!
    club_name: String!
    slug: String!
    "First feature image of the club, for the table thumbnail."
    cover_image_url: String
    super_category: String
    category: String
    locality: String
    "City the club operates in (resolved Location label)."
    location_label: String
    followers_count: Int!
    total_pods: Int!
    "Active pods dated now or later."
    upcoming_pods: Int!
    "Venues that auto-match the club (location + category)."
    matched_venues_count: Int!
    is_verified: Boolean!
    is_active: Boolean!
    created_at: String!
  }

  "Server-side table page for the shared table engine (myAdminClubsTable)."
  type ClubAdminClubInfoTablePage {
    rows: [ClubAdminClubInfoRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "A host a Club Admin can assign to a pod (approved hosts only)."
  type ClubAdminHostOption {
    user_id: ID!
    full_name: String!
    email: String
  }

  """
  One pod under a club the caller administers — the Club Studio "Your Pods" row.

  Field-for-field identical to VenuePod, with club_id/club_name where that type
  carries venue_id/venue_name, so Club Studio and Venue Studio render the same
  row through ONE component in mWeb and native (rules 27 + 34).

  It reuses VenuePodBucket rather than declaring a club-named twin of the same
  four values: the bucket describes the POD's lifecycle, not who is looking at
  it, and a second enum is how the two client unions drift apart.
  """
  type ClubPod {
    id: ID!
    pod_slug: String!
    pod_title: String!
    pod_date_time: String!
    pod_end_date_time: String
    pod_amount: Int!
    pod_type: PodType!
    no_of_spots: Int!
    "Seats taken — attendees plus the extra seats they bought."
    attendee_count: Int!
    "Attendee user ids — resolve names via publicUsersByIds."
    pod_attendees: [ID!]!
    host_names: [String!]!
    club_id: ID!
    club_name: String!
    bucket: VenuePodBucket!
    is_active: Boolean!
    completed_at: String
    "Set when the pod was cancelled (soft-deleted)."
    cancelled_at: String
    created_at: String!
  }

  """
  Roll-up figures behind the Club Studio "Your Pods" header, computed over EVERY
  pod in scope (the list itself is capped) so the apps never re-derive money or
  state counts themselves.

  Cancelled pods count in the cancelled field only: their spots were never sold
  and their payments were refunded, so they stay out of capacity, fill and
  revenue.
  """
  type ClubPodSummary {
    "Clubs in scope — 1 when club_id narrows to a single club."
    clubs: Int!
    total: Int!
    upcoming: Int!
    "Running right now (the ONGOING bucket)."
    ongoing: Int!
    "Finished (the COMPLETED bucket)."
    completed: Int!
    cancelled: Int!
    "Capacity across non-cancelled pods."
    total_spots: Int!
    "Seats taken across non-cancelled pods (attendees + extra seats)."
    filled_spots: Int!
    "People in those pods — extra seats excluded."
    total_attendees: Int!
    "filled_spots / total_spots (0..1); 0 when there is no capacity."
    fill_rate: Float!
    "Start of the soonest upcoming pod, ISO. Null when nothing is scheduled."
    next_pod_date_time: String
    "Collected from SUCCESS payments on the non-cancelled pods in scope."
    total_revenue: Float!
    currency_symbol: String!
  }

  extend type Query {
    "Clubs the signed-in user administers (CLUB_ADMIN scope)."
    myAdminClubs: [Club!]!
    "Approved hosts matching the search, for the assign-host picker. Club-admin scoped."
    clubAdminHostSearch(search: String): [ClubAdminHostOption!]!
    "Paginated + filtered 'Your Clubs' list for the signed-in Club Admin."
    myAdminClubsPage(filter: MyAdminClubsFilter): ClubAdminClubsPage!
    "Max-info table page over the signed-in Club Admin's clubs ('Your Clubs' table)."
    myAdminClubsTable(query: TableQueryInput): ClubAdminClubInfoTablePage!
    """
    Pods across the signed-in Club Admin's clubs, scoped server-side. Shows
    EVERY stage — including pods awaiting the venue owner's approval and
    cancelled ones — so a club admin can open and edit a pod wherever it sits
    in the booking cycle. Pass club_id to narrow to one of their clubs.
    """
    clubAdminPodsTable(club_id: ID, query: TableQueryInput): PodTablePage!
    """
    Pods across the signed-in Club Admin's clubs for the Club Studio "Your Pods"
    section, newest first — the club-side twin of venuePods. Every stage shows,
    cancelled and awaiting-venue-approval included, matching clubAdminPodsTable.

    Scope is derived SERVER-SIDE from the caller's club memberships; club_id
    only NARROWS within them and throws FORBIDDEN for a club they do not
    administer (the same rule clubAdminPodsTable applies).
    """
    myClubPods(club_id: ID): [ClubPod!]!
    "Roll-up figures for exactly the myClubPods scope, over every pod in it."
    myClubPodsSummary(club_id: ID): ClubPodSummary!
    "Full action trail of one pod in the caller's clubs, newest first."
    clubAdminPodAuditLogs(pod_doc_id: ID!): [PodAuditLog!]!
    """
    Attendees of one pod in the caller's clubs — the club-admin twin of
    adminPodAttendees.

    Its own query rather than a role added to the admin one: CLUB_ADMIN is a
    membership of a club, not a role on the user, so requireRole cannot express
    it. Gated on assertClubAdminForPod, which is what keeps a club admin inside
    their own club.
    """
    clubAdminPodAttendees(pod_doc_id: ID!): [AdminPodAttendee!]!
    """
    Payments for ONE pod in the caller's clubs.

    Deliberately takes a pod id instead of the admin paymentsTable's free-form
    TableQueryInput: that input can express "every payment on the platform", and
    handing it to a club admin would let them read other clubs' money. The pod
    filter is applied server-side and cannot be overridden by the caller.
    """
    clubAdminPodPayments(pod_doc_id: ID!, query: TableQueryInput): PaymentTablePage!
    "Rating + review summary for one pod in the caller's clubs."
    clubAdminPodFeedback(pod_doc_id: ID!, limit: Int): PodFeedbackSummary!
    """
    The host profile behind one of this pod's hosts.

    Scoped to the pod, not to an arbitrary user id: a club admin may read the
    host running their pod, not look up any host on the platform.
    """
    clubAdminPodHost(pod_doc_id: ID!, user_id: ID!): Host
    "Aggregated metrics for the signed-in Club Admin's clubs."
    clubAdminDashboard(from: String, to: String): ClubAdminDashboard!
    "Table page over the dashboard's computed per-club breakdown rows."
    clubAdminDashboardTable(query: TableQueryInput, from: String, to: String): ClubAdminClubRowTablePage!
  }

  extend type Mutation {
    "Create a pod under a club the signed-in user administers."
    clubAdminCreatePod(input: CreatePodInput!): Pod!
    "Edit any field of a pod in one of the signed-in user's clubs."
    clubAdminUpdatePod(pod_doc_id: ID!, input: UpdatePodInput!): Pod!
    "Soft-delete a pod in one of the signed-in user's clubs."
    clubAdminDeletePod(pod_doc_id: ID!): Boolean!
    "Edit a club the signed-in user administers (governance fields are ignored)."
    clubAdminUpdateClub(club_doc_id: ID!, input: UpdateClubInput!): Club!
  }
`;
