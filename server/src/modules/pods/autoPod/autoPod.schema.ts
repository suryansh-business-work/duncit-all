import gql from 'graphql-tag';

export const autoPodTypeDefs = gql`
  """
  Where an Auto Pod sits in its enrolment cycle. OPEN is visible to every
  approved venue; CLAIMING means a venue enrolled and the host + club admin
  steps are open in parallel; LIVE means it materialized into an ordinary pod.
  """
  enum AutoPodStage {
    OPEN
    CLAIMING
    MATERIALIZING
    LIVE
    CANCELLED
    EXPIRED
  }

  type AutoPodVenueClaim {
    venue_id: ID!
    venue_slot_id: ID!
    owner_user_id: ID!
    venue_name: String!
    pod_date_time: String!
    pod_end_date_time: String
    slot_price: Float!
    accepted_at: String!
  }

  type AutoPodHostClaim {
    user_id: ID!
    host_name: String!
    assigned_at: String!
  }

  type AutoPodClubClaim {
    club_id: ID!
    club_name: String!
    user_id: ID!
    claimed_at: String!
  }

  type AutoPodEvent {
    action: String!
    actor_user_id: ID
    actor_name: String!
    note: String!
    at: String!
  }

  type AutoPod {
    id: ID!
    auto_pod_no: String!
    stage: AutoPodStage!
    pod_title: String!
    pod_description: String!
    pod_info: String!
    pod_hashtag: [String!]!
    pod_images_and_videos: [PodMedia!]!
    reel_url: String
    super_category_id: ID!
    sub_category_id: ID!
    "Display name of the sub-category the admin chose."
    category_name: String
    pod_type: PodType!
    pod_amount: Float!
    no_of_spots: Int!
    pod_occurrence: PodOccurrence!
    what_this_pod_offers: [String!]!
    available_perks: [String!]!
    payment_terms: String
    place_charges: [PodPlaceCharge!]!
    "Venue enrolment — null until a venue accepts and picks its slot."
    venue_claim: AutoPodVenueClaim
    "Host enrolment — null until a host assigns themselves."
    host_claim: AutoPodHostClaim
    "Club Admin enrolment — null until a club admin claims it for their club."
    club_claim: AutoPodClubClaim
    "True when the calling user (or one of their clubs) already enrolled."
    viewer_claimed: Boolean!
    pod_id: ID
    "The materialized pod, once LIVE."
    pod: Pod
    """
    Projected earnings for the CALLING host under their own rates. Null before a
    venue has priced it, and for callers who are not hosts.
    """
    expected_host_earnings: Float
    materialized_at: String
    cancel_reason: String
    cancelled_at: String
    events: [AutoPodEvent!]!
    created_at: String!
    updated_at: String!
  }

  type AutoPodActionCounts {
    venue: Int!
    host: Int!
    club: Int!
  }

  type AutoPodTablePage {
    rows: [AutoPod!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input CreateAutoPodInput {
    pod_title: String!
    pod_description: String!
    sub_category_id: ID!
    pod_amount: Float!
    no_of_spots: Int!
    pod_images_and_videos: [PodMediaInput!]!
    pod_info: String
    pod_hashtag: [String!]
    reel_url: String
    pod_occurrence: PodOccurrence
    what_this_pod_offers: [String!]
    available_perks: [String!]
    payment_terms: String
    place_charges: [PodPlaceChargeInput!]
  }

  input UpdateAutoPodInput {
    pod_title: String
    pod_description: String
    sub_category_id: ID
    pod_amount: Float
    no_of_spots: Int
    pod_images_and_videos: [PodMediaInput!]
    pod_info: String
    pod_hashtag: [String!]
    reel_url: String
    pod_occurrence: PodOccurrence
    what_this_pod_offers: [String!]
    available_perks: [String!]
    payment_terms: String
    place_charges: [PodPlaceChargeInput!]
  }

  extend type Query {
    "Admin console table — every Auto Pod at every stage."
    adminAutoPodsTable(query: TableQueryInput): AutoPodTablePage!
    "One Auto Pod. Admins, and any partner who can act on or has enrolled in it."
    autoPod(auto_pod_doc_id: ID!): AutoPod!
    "Open offers this venue owner may accept, plus the ones they accepted."
    venueAutoPods: [AutoPod!]!
    "Venue-accepted offers this host may take, plus the ones they took."
    hostAutoPods: [AutoPod!]!
    "Venue-accepted offers one of the caller's clubs may claim, plus their claims."
    clubAdminAutoPods: [AutoPod!]!
    "Per-role counts of Auto Pods waiting on the caller — drives role-switch landing."
    myAutoPodActionCounts: AutoPodActionCounts!
  }

  extend type Mutation {
    """
    Opens an Auto Pod for the marketplace. A Duncit admin opens one for every
    club to compete for; a Club Admin passes club_id to open one FOR their own
    club, which enrols that club at creation (so only a venue and a host are
    still needed) and fixes the category to the club's own.
    """
    createAutoPod(input: CreateAutoPodInput!, club_id: ID): AutoPod!
    updateAutoPod(auto_pod_doc_id: ID!, input: UpdateAutoPodInput!): AutoPod!
    cancelAutoPod(auto_pod_doc_id: ID!, reason: String): AutoPod!
    "Venue enrols: accepts the offer and commits one of its own slots."
    venueAcceptAutoPod(auto_pod_doc_id: ID!, venue_id: ID!, slot_id: ID!): AutoPod!
    "Host enrols: assigns themselves to a venue-accepted Auto Pod."
    hostAssignAutoPod(auto_pod_doc_id: ID!): AutoPod!
    "Club Admin enrols: claims a venue-accepted Auto Pod for one of their clubs."
    clubClaimAutoPod(auto_pod_doc_id: ID!, club_id: ID!): AutoPod!
  }
`;
