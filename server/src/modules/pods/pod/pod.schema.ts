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

  "Venue's decision on the pod's slot request — PENDING pods are offline until APPROVED."
  enum PodVenueApproval {
    NONE
    PENDING
    APPROVED
    DECLINED
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
    image_url: String!
    images: [String!]!
    unit_cost: Float!
    quantity: Int!
    available_count: Int!
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
    venue_slot_id: ID
    club_id: ID!
    club_slug: String!
    club: Club
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
    "Users who liked this pod — powers the 'who liked' list (explore item 8)."
    liked_user_ids: [ID!]!
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
    is_deleted: Boolean!
    deleted_at: String
    venue_approval_status: PodVenueApproval!
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
    "How many users liked this comment (explore item 4 — comment reactions)."
    like_count: Int!
    "Whether the signed-in viewer liked this comment."
    liked_by_me: Boolean!
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
    venue_slot_id: ID
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
    is_active: Boolean
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

  "What deleting a pod means for its audience — shown in the host's delete dialog."
  type HostPodDeleteImpact {
    "Attendees other than the pod's hosts."
    other_attendee_count: Int!
    "SUCCESS payments that will be marked for refund on delete."
    refundable_payment_count: Int!
    refund_total: Float!
    currency_symbol: String!
  }

  "The only fields a host may edit on their own pod."
  input HostUpdatePodInput {
    pod_title: String!
    pod_description: String!
    pod_images_and_videos: [PodMediaInput!]!
  }

  extend type Query {
    pods(filter: PodFilterInput): [Pod!]!
    myHostPods(from: String, to: String): [Pod!]!
    pod(pod_doc_id: ID!): Pod
    podBySlugs(club_slug: String!, pod_slug: String!): Pod
    podComments(pod_doc_id: ID!): [PodComment!]!
    "Location ids that currently have at least one live (active, not-yet-passed) pod."
    activePodLocationIds: [ID!]!
    hostPodDeleteImpact(pod_doc_id: ID!): HostPodDeleteImpact!
  }

  extend type Mutation {
    createPod(input: CreatePodInput!): Pod!
    createPartnerPod(input: CreatePodInput!): Pod!
    updatePod(pod_doc_id: ID!, input: UpdatePodInput!): Pod!
    hostUpdatePod(pod_doc_id: ID!, input: HostUpdatePodInput!): Pod!
    hostDeletePod(pod_doc_id: ID!, reason_subject: String!, reason_note: String): Boolean!
    addPodStatus(pod_doc_id: ID!, media: PodMediaInput!): Pod!
    deletePod(pod_doc_id: ID!): Boolean!
    incrementPodHits(pod_doc_id: ID!): Pod!
    togglePodLike(pod_doc_id: ID!): Pod!
    addPodComment(pod_doc_id: ID!, text: String!): PodComment!
    "Like/unlike a pod comment — returns the updated comment (explore item 4)."
    togglePodCommentLike(pod_doc_id: ID!, comment_id: ID!): PodComment!
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
