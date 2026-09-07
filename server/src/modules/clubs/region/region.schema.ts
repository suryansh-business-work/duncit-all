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

  "One pod in the host drawer's table."
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
    "One host's pods inside this region — the side drawer's table."
    regionHostPods(host_user_id: ID!, query: TableQueryInput): RegionHostPodPage!
  }

  extend type Mutation {
    renameMyRegion(region_name: String!): Region!
    "Refused for somebody who is not a Club Admin, or is already in a region."
    addRegionClubAdmin(user_id: ID!): Region!
    removeRegionClubAdmin(user_id: ID!): Region!
  }
`;
