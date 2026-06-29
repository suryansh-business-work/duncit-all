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
    meetup_venues_id: [String!]!
    "Hosts explicitly linked by an admin (Bug 5)."
    host_ids: [ID!]!
    "Resolved host profiles — linked hosts, or the hosts of the club's pods as a fallback."
    hosts: [ClubActor!]!
    "How many users follow this club."
    followers_count: Int!
    category_id: ID
    super_category_id: ID
    "Verified badge for official clubs (explore item 15)."
    is_verified: Boolean!
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  input ClubFilterInput {
    search: String
    category_id: ID
    super_category_id: ID
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
    host_ids: [ID!]
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
    host_ids: [ID!]
    category_id: ID
    super_category_id: ID
    is_verified: Boolean
    is_active: Boolean
  }

  extend type Query {
    clubs(filter: ClubFilterInput): [Club!]!
    club(club_doc_id: ID!): Club
    clubBySlug(club_slug: String!): Club
  }

  extend type Mutation {
    createClub(input: CreateClubInput!): Club!
    updateClub(club_doc_id: ID!, input: UpdateClubInput!): Club!
    deleteClub(club_doc_id: ID!): Boolean!
  }
`;
