export const podTypeDefs = /* GraphQL */ `
  enum PodType {
    NATIVE_FREE
    NATIVE_PAID
    NATIVE_PAID_PREMIUM
    NON_NATIVE_FREE
    NON_NATIVE_PAID
  }

  enum PodOccurrence {
    ONE_TIME
    DAILY
    WEEKLY
    MONTHLY
    ALTERNATE_DAY
    WEEKENDS_ONLY
  }

  type PodMedia {
    url: String!
    type: CategoryMediaType!
  }

  input PodMediaInput {
    url: String!
    type: CategoryMediaType
  }

  type Pod {
    id: ID!
    pod_id: String!
    pod_title: String!
    pod_hosts_id: [ID!]!
    location_id: ID!
    club_id: ID!
    zone_name: String
    pod_hashtag: [String!]!
    pod_images_and_videos: [PodMedia!]!
    pod_hits: Int!
    pod_attendees: [ID!]!
    pod_description: String!
    pod_date_time: String!
    pod_end_date_time: String
    pod_type: PodType!
    pod_amount: Int!
    pod_occurrence: PodOccurrence!
    no_of_spots: Int!
    pod_info: String
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  input PodFilterInput {
    club_id: ID
    location_id: ID
    zone_name: String
    search: String
    is_active: Boolean
  }

  input CreatePodInput {
    pod_id: String
    pod_title: String!
    pod_hosts_id: [ID!]!
    location_id: ID!
    club_id: ID!
    zone_name: String
    pod_hashtag: [String!]
    pod_images_and_videos: [PodMediaInput!]
    pod_attendees: [ID!]
    pod_description: String!
    pod_date_time: String!
    pod_end_date_time: String
    pod_type: PodType!
    pod_amount: Int
    pod_occurrence: PodOccurrence
    no_of_spots: Int
    pod_info: String
  }

  input UpdatePodInput {
    pod_title: String
    pod_hosts_id: [ID!]
    location_id: ID
    club_id: ID
    zone_name: String
    pod_hashtag: [String!]
    pod_images_and_videos: [PodMediaInput!]
    pod_attendees: [ID!]
    pod_description: String
    pod_date_time: String
    pod_end_date_time: String
    pod_type: PodType
    pod_amount: Int
    pod_occurrence: PodOccurrence
    no_of_spots: Int
    pod_info: String
    is_active: Boolean
  }

  extend type Query {
    pods(filter: PodFilterInput): [Pod!]!
    pod(pod_doc_id: ID!): Pod
  }

  extend type Mutation {
    createPod(input: CreatePodInput!): Pod!
    updatePod(pod_doc_id: ID!, input: UpdatePodInput!): Pod!
    deletePod(pod_doc_id: ID!): Boolean!
    incrementPodHits(pod_doc_id: ID!): Pod!
  }
`;
