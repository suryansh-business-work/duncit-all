export const regionTypeDefs = /* GraphQL */ `
  """
  A Regional Club Admin's patch. Only the Club Admins are stored — every level
  of the tree below them is derived from the clubs they run and the pods those
  clubs hold.
  """
  type Region {
    id: ID!
    "Permanent human id (RGN-000001)."
    region_no: String!
    region_name: String!
    manager_user_id: ID!
    club_admin_user_ids: [ID!]!
    club_admin_count: Int!
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  "One box on the region canvas: REGION | CITY | LOCALITY | CLUB_ADMIN | HOST."
  type RegionTreeNode {
    "Carries the whole path, so one club admin under two localities is two nodes."
    id: ID!
    kind: String!
    parent_id: ID
    label: String!
    "The line under the label — a club list, an email."
    sub_label: String!
    "Direct children, or pods on a HOST node."
    count: Int!
    "Location id on CITY, user id on CLUB_ADMIN and HOST, '' elsewhere."
    ref_id: String!
  }

  type RegionTreeEdge {
    id: ID!
    source: ID!
    target: ID!
  }

  type RegionTree {
    nodes: [RegionTreeNode!]!
    edges: [RegionTreeEdge!]!
  }

  "One Club Admin in the region, with the clubs they run."
  type RegionMember {
    user_id: ID!
    name: String!
    email: String!
    clubs: [String!]!
    club_count: Int!
  }

  "A Club Admin who could be added — anyone already in a region is left out."
  type RegionCandidate {
    user_id: ID!
    name: String!
    email: String!
    region_name: String!
  }

  """
  One club a region's Club Admin runs — the first level of the drill-down a
  manager opens from the Club Admins table.
  """
  type RegionClub {
    id: ID!
    "Public club handle (the slug), not the document id."
    club_id: String!
    club_name: String!
    city: String!
    locality: String!
    "Every pod the club has ever held, cancelled ones included."
    pod_count: Int!
    is_active: Boolean!
  }

  "Server-side table page for the shared table engine."
  type RegionClubPage {
    rows: [RegionClub!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "One pod in the host drawer's table, or in a club's."
  type RegionHostPod {
    id: ID!
    pod_id: String!
    pod_title: String!
    pod_date_time: String!
    pod_mode: String!
    pod_amount: Float!
    no_of_spots: Int!
    club_name: String!
    is_active: Boolean!
  }

  "Server-side table page for the shared table engine."
  type RegionHostPodPage {
    rows: [RegionHostPod!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "The signed-in Regional Club Admin's own region, created on first read."
    myRegion: Region!
    "The whole canvas: Region -> City -> Locality -> Club Admin -> Host."
    myRegionTree: RegionTree!
    "The region's Club Admins, with the clubs each one runs."
    myRegionMembers: [RegionMember!]!
    "Club Admins this manager could add to the region."
    regionClubAdminCandidates(search: String, limit: Int): [RegionCandidate!]!
    "One host's pods inside this region — the canvas drawer's table."
    regionHostPods(host_user_id: ID!, query: TableQueryInput): RegionHostPodPage!
    """
    The clubs ONE of the region's Club Admins runs.

    Refused for somebody who is not in the caller's region: a manager reads
    their own patch, and a user id from elsewhere is not an entry point.
    """
    regionClubAdminClubs(user_id: ID!, query: TableQueryInput): RegionClubPage!
    "Pods of ONE club in the region — the second level of the drill-down."
    regionClubPods(club_id: ID!, query: TableQueryInput): RegionHostPodPage!
    """
    Attendees of one pod in the caller's region — the region twin of
    adminPodAttendees.

    Its own query rather than a role added to the admin one: a region is a
    MEMBERSHIP chain (my Club Admins -> their clubs -> those clubs' pods), and
    requireRole cannot express a chain. Gated on the pod belonging to the
    region, which is what keeps a manager inside their own patch.
    """
    regionPodAttendees(pod_doc_id: ID!): [AdminPodAttendee!]!
    "Full action trail of one pod in the caller's region, newest first."
    regionPodAuditLogs(pod_doc_id: ID!): [PodAuditLog!]!
    """
    Payments for ONE pod in the caller's region.

    Deliberately takes a pod id instead of the admin paymentsTable's free-form
    TableQueryInput: that input can express "every payment on the platform".
    The pod filter is applied server-side and cannot be widened by the caller.
    """
    regionPodPayments(pod_doc_id: ID!, query: TableQueryInput): PaymentTablePage!
    "Rating + review summary for one pod in the caller's region."
    regionPodFeedback(pod_doc_id: ID!, limit: Int): PodFeedbackSummary!
    """
    The host profile behind one of this pod's hosts. Scoped to the pod, not to
    an arbitrary user id: a manager may read the host running a pod in their
    region, not look up any host on the platform.
    """
    regionPodHost(pod_doc_id: ID!, user_id: ID!): Host
  }

  extend type Mutation {
    renameMyRegion(region_name: String!): Region!
    "Refused for somebody who is not a Club Admin, or is already in a region."
    addRegionClubAdmin(user_id: ID!): Region!
    removeRegionClubAdmin(user_id: ID!): Region!
  }
`;
