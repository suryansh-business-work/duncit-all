export const clubTypeDefs = /* GraphQL */ `
  type ClubMedia {
    url: String!
    type: CategoryMediaType!
  }

  input ClubMediaInput {
    url: String!
    type: CategoryMediaType
  }

  type ClubActor {
    id: ID!
    name: String!
    avatar_url: String
  }

  type ClubFaq {
    question: String!
    answer: String!
  }

  input ClubFaqInput {
    question: String!
    answer: String!
  }

  type ClubRating {
    id: ID!
    user_id: ID!
    user_name: String
    user_photo: String
    stars: Int!
    comment: String
    created_at: String!
  }

  type Club {
    id: ID!
    club_id: String!
    club_name: String!
    club_description: String
    club_feature_images_and_videos: [ClubMedia!]!
    club_whats_app_community_link: String
    club_whats_app_announcement_link: String
    club_whats_app_group_link: String
    club_moments: [ClubMedia!]!
    "Admin-authored Club Detail page content, each rendered as bullets."
    who_we_are: [String!]!
    what_we_do: [String!]!
    perks: [String!]!
    values: [String!]!
    faqs: [ClubFaq!]!
    "Deprecated hand-picked venue links; venues now auto-match by location + category."
    meetup_venues_id: [String!]!
    "City the club operates in (ref Location)."
    location_id: ID
    "Optional locality/zone within the club's city."
    locality: String!
    "APPROVED, active venues that match this club by location + Super/Sub category."
    matched_venues: [Venue!]!
    "How many venues auto-match this club (location + category)."
    matched_venues_count: Int!
    "Hosts explicitly linked by an admin (Bug 5)."
    host_ids: [ID!]!
    "Resolved host profiles — linked hosts, or the hosts of the club's pods as a fallback."
    hosts: [ClubActor!]!
    "Users who administer this club (assigned by an admin) — the CLUB_ADMIN scope."
    admin_user_ids: [ID!]!
    "Resolved profiles of the club's assigned admins."
    club_admins: [ClubActor!]!
    "How many users follow this club."
    followers_count: Int!
    category_id: ID
    super_category_id: ID
    "Verified badge for official clubs (explore item 15)."
    is_verified: Boolean!
    is_active: Boolean!
    "Average star rating (1-5) across all user ratings. 0 when no ratings yet."
    rating: Float!
    "Total number of user ratings submitted."
    ratings_count: Int!
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (clubsTable)."
  type ClubTablePage {
    rows: [Club!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input ClubFilterInput {
    search: String
    category_id: ID
    super_category_id: ID
    location_id: ID
    "Narrow to a locality/zone within the city."
    locality: String
    is_verified: Boolean
    is_active: Boolean
  }

  input CreateClubInput {
    club_id: String
    club_name: String!
    club_description: String
    club_feature_images_and_videos: [ClubMediaInput!]
    club_whats_app_community_link: String
    club_whats_app_announcement_link: String
    club_whats_app_group_link: String
    club_moments: [ClubMediaInput!]
    who_we_are: [String!]
    what_we_do: [String!]
    perks: [String!]
    values: [String!]
    faqs: [ClubFaqInput!]
    meetup_venues_id: [String!]
    location_id: ID
    locality: String
    host_ids: [ID!]
    admin_user_ids: [ID!]
    category_id: ID
    super_category_id: ID
    is_verified: Boolean
    is_active: Boolean
  }

  input UpdateClubInput {
    club_name: String
    club_description: String
    club_feature_images_and_videos: [ClubMediaInput!]
    club_whats_app_community_link: String
    club_whats_app_announcement_link: String
    club_whats_app_group_link: String
    club_moments: [ClubMediaInput!]
    who_we_are: [String!]
    what_we_do: [String!]
    perks: [String!]
    values: [String!]
    faqs: [ClubFaqInput!]
    meetup_venues_id: [String!]
    location_id: ID
    locality: String
    host_ids: [ID!]
    admin_user_ids: [ID!]
    category_id: ID
    super_category_id: ID
    is_verified: Boolean
    is_active: Boolean
  }

  extend type Query {
    clubs(filter: ClubFilterInput): [Club!]!
    clubsTable(query: TableQueryInput): ClubTablePage!
    club(club_doc_id: ID!): Club
    clubBySlug(club_slug: String!): Club
    clubRatings(club_doc_id: ID!): [ClubRating!]!
  }

  extend type Mutation {
    createClub(input: CreateClubInput!): Club!
    updateClub(club_doc_id: ID!, input: UpdateClubInput!): Club!
    deleteClub(club_doc_id: ID!): Boolean!
    "Submit or update a star rating (1-5) on a club. Requires authentication."
    addClubRating(club_doc_id: ID!, stars: Int!, comment: String): Club!
  }
`;
