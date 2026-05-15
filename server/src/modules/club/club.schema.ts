export const clubTypeDefs = /* GraphQL */ `
  type ClubMedia {
    url: String!
    type: CategoryMediaType!
  }

  input ClubMediaInput {
    url: String!
    type: CategoryMediaType
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
    meetup_venues_id: [String!]!
    category_id: ID
    super_category_id: ID
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  input ClubFilterInput {
    search: String
    category_id: ID
    super_category_id: ID
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
    meetup_venues_id: [String!]
    category_id: ID
    super_category_id: ID
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
    meetup_venues_id: [String!]
    category_id: ID
    super_category_id: ID
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
