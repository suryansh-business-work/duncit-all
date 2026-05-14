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

  enum PodMode {
    PHYSICAL
    VIRTUAL
  }

  type PodMedia {
    url: String!
    type: CategoryMediaType!
  }

  input PodMediaInput {
    url: String!
    type: CategoryMediaType
  }

  type PodPlaceCharge {
    label: String!
    amount: Int!
    note: String
  }

  input PodPlaceChargeInput {
    label: String!
    amount: Int!
    note: String
  }

  type PodProductRequest {
    product_id: ID!
    product_name: String!
    unit_cost: Float!
    quantity: Int!
    total_cost: Float!
  }

  input PodProductRequestInput {
    product_id: ID!
    quantity: Int!
  }

  type Pod {
    id: ID!
    pod_id: String!
    pod_title: String!
    pod_hosts_id: [ID!]!
    location_id: ID
    venue_id: ID
    club_id: ID!
    club_slug: String!
    zone_name: String
    pod_mode: PodMode!
    meeting_platform: String
    meeting_url: String
    meeting_notes: String
    place_label: String
    place_detail: String
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
    what_this_pod_offers: [String!]!
    available_perks: [String!]!
    payment_terms: String
    place_charges: [PodPlaceCharge!]!
    products_enabled: Boolean!
    product_requests: [PodProductRequest!]!
    product_cost_total: Float!
    is_active: Boolean!
    host_names: [String!]!
    like_count: Int!
    liked_by_me: Boolean!
    comment_count: Int!
    completed_at: String
    created_at: String!
    updated_at: String!
  }

  type PodComment {
    id: ID!
    author_id: ID!
    author_name: String
    author_photo: String
    text: String!
    created_at: String!
  }

  input PodFilterInput {
    club_id: ID
    venue_id: ID
    location_id: ID
    zone_name: String
    search: String
    is_active: Boolean
    host_user_id: ID
  }

  input CreatePodInput {
    pod_id: String
    pod_title: String!
    pod_hosts_id: [ID!]!
    location_id: ID
    venue_id: ID
    club_id: ID!
    zone_name: String
    pod_mode: PodMode
    meeting_platform: String
    meeting_url: String
    meeting_notes: String
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
    what_this_pod_offers: [String!]
    available_perks: [String!]
    payment_terms: String
    place_charges: [PodPlaceChargeInput!]
    products_enabled: Boolean
    product_requests: [PodProductRequestInput!]
  }

  input UpdatePodInput {
    pod_title: String
    pod_hosts_id: [ID!]
    location_id: ID
    venue_id: ID
    club_id: ID
    zone_name: String
    pod_mode: PodMode
    meeting_platform: String
    meeting_url: String
    meeting_notes: String
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
    what_this_pod_offers: [String!]
    available_perks: [String!]
    payment_terms: String
    place_charges: [PodPlaceChargeInput!]
    products_enabled: Boolean
    product_requests: [PodProductRequestInput!]
    is_active: Boolean
  }

  extend type Query {
    pods(filter: PodFilterInput): [Pod!]!
    pod(pod_doc_id: ID!): Pod
    podBySlugs(club_slug: String!, pod_slug: String!): Pod
    podComments(pod_doc_id: ID!): [PodComment!]!
  }

  extend type Mutation {
    createPod(input: CreatePodInput!): Pod!
    updatePod(pod_doc_id: ID!, input: UpdatePodInput!): Pod!
    deletePod(pod_doc_id: ID!): Boolean!
    incrementPodHits(pod_doc_id: ID!): Pod!
    togglePodLike(pod_doc_id: ID!): Pod!
    addPodComment(pod_doc_id: ID!, text: String!): PodComment!
    deletePodComment(pod_doc_id: ID!, comment_id: ID!): Boolean!
    generateMeetingLink(
      platform: String!
      title: String!
      start: String!
      end: String
    ): MeetingLinkResult!
  }

  type MeetingLinkResult {
    ok: Boolean!
    url: String
    message: String
    requires_oauth: Boolean
  }
`;
