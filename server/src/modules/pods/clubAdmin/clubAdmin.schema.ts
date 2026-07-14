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

  extend type Query {
    "Clubs the signed-in user administers (CLUB_ADMIN scope)."
    myAdminClubs: [Club!]!
    "Paginated + filtered 'Your Clubs' list for the signed-in Club Admin."
    myAdminClubsPage(filter: MyAdminClubsFilter): ClubAdminClubsPage!
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
