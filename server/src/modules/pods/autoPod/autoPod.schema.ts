import gql from 'graphql-tag';

export const autoPodTypeDefs = gql`
  """
  Where an Auto Pod sits in its enrolment cycle. OPEN means nobody has enrolled
  yet and all three roles are offered it; CLAIMING means at least one partner
  enrolled and the rest may still enrol, in any order; LIVE means it
  materialized into an ordinary pod.
  """
  enum AutoPodStage {
    OPEN
    CLAIMING
    MATERIALIZING
    LIVE
    CANCELLED
    EXPIRED
  }

  "Which enrolment pinned the Auto Pod to its city."
  enum AutoPodLocationBinder {
    VENUE
    HOST
    CLUB
  }

  """
  The city (Country → State → City, one admin Location row) the offer is pinned
  to. Null until the first partner enrols; from then on only partners in that
  city are offered it.
  """
  type AutoPodLocation {
    location_id: ID!
    location_name: String!
    country: String!
    state: String!
    city: String!
    bound_by: AutoPodLocationBinder!
    bound_at: String!
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
    "False while an admin has paused the offer: shown to nobody, and no claim lands on it."
    is_active: Boolean!
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
    "Super › Category › Sub names, walked up from the sub-category."
    category_path: [String!]!
    """
    PHYSICAL waits on a venue to bring the slot; VIRTUAL carries its own
    meeting details and dates and waits on a host and a club only.
    """
    pod_mode: PodMode!
    meeting_platform: String
    meeting_url: String
    meeting_notes: String
    "VIRTUAL only — a physical offer's dates come from the venue's slot."
    pod_date_time: String
    pod_end_date_time: String
    pod_type: PodType!
    pod_amount: Float!
    no_of_spots: Int!
    pod_occurrence: PodOccurrence!
    what_this_pod_offers: [String!]!
    available_perks: [String!]!
    payment_terms: String
    place_charges: [PodPlaceCharge!]!
    products_enabled: Boolean!
    product_requests: [PodProductRequest!]!
    "Venue enrolment — null until a venue accepts and picks its slot. Always null on a VIRTUAL offer."
    venue_claim: AutoPodVenueClaim
    "Host enrolment — null until a host assigns themselves."
    host_claim: AutoPodHostClaim
    "Club Admin enrolment — null until a club admin claims it for their club."
    club_claim: AutoPodClubClaim
    "The city the first enrolment pinned it to — null while nobody has enrolled."
    location: AutoPodLocation
    """
    When this offer is released unless everyone needed has enrolled by then —
    its roll-out plus Pod Settings' auto_pod_assignment_expiry_hours, or the
    venue window if that closes sooner while it still waits on a venue. Set on
    every list and read while the offer is enrolling; null once it is live,
    cancelled or expired. Every card counts it down.
    """
    expires_at: String
    """
    When this offer leaves venues' lists if none has accepted it by then —
    venue_window_from (or created_at) plus auto_pod_venue_expiry_hours. Set on
    the venue queue only. Superseded by expires_at, which already folds it in.
    """
    venue_expires_at: String @deprecated(reason: "Read expires_at — the one deadline every list carries.")
    "Account Health points a venue or host loses by withdrawing (Pod Settings). Set on their own queues."
    withdraw_penalty_points: Int
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

  "A venue that could accept an offer in a sub-category."
  type AutoPodAudienceVenue {
    id: ID!
    venue_name: String!
    city: String!
    locality: String!
    owner_name: String!
  }

  "A host approved in a sub-category."
  type AutoPodAudienceHost {
    user_id: ID!
    full_name: String!
    email: String!
    phone: String!
  }

  "A club admin whose club carries a sub-category, with every such club of theirs."
  type AutoPodAudienceClubAdmin {
    user_id: ID!
    full_name: String!
    email: String!
    club_names: [String!]!
  }

  """
  Everyone who could enrol in a fresh Auto Pod of one sub-category, before a
  city is pinned. All three counts must be positive before the template is
  rolled out — an offer nobody can complete never goes live.
  """
  type AutoPodAudience {
    venue_count: Int!
    host_count: Int!
    club_admin_count: Int!
    venues: [AutoPodAudienceVenue!]!
    hosts: [AutoPodAudienceHost!]!
    club_admins: [AutoPodAudienceClubAdmin!]!
  }

  "One of a venue's free slots, priced as the venue would be paid for the offer."
  type AutoPodVenueSlot {
    id: ID!
    start_at: String!
    end_at: String!
    whole_day: Boolean!
    space_label: String!
    capacity: Int!
    "The slot's price — what the pod pays the venue before commission."
    price: Float!
    "What the venue is paid after Finance's venue commission."
    venue_receives: Float!
    venue_commission_pct: Float!
    "What the host would be left with — negative when the slot costs more than the pod collects."
    host_receives: Float!
    "False when the pod's money could not cover this slot; accepting it would be refused."
    viable: Boolean!
  }

  type AutoPodVenueSlots {
    "How many days ahead the list reaches — Pod Settings' auto_pod_slot_window_days."
    window_days: Int!
    "When the offer leaves this venue's list if it does not accept."
    expires_at: String
    "Nearest first."
    slots: [AutoPodVenueSlot!]!
  }

  """
  What the host's numbers add up to on an offer — under their own rates, the
  venue's slot price and the club admin's cut — and the spot limits the
  activity and the booked space impose.
  """
  type AutoPodHostProjection {
    min_spots: Int!
    max_spots: Int!
    pod_amount: Float!
    no_of_spots: Int!
    total_collection: Float!
    gst_amount: Float!
    platform_fee_amount: Float!
    venue_amount: Float!
    club_admin_amount: Float!
    host_receives: Float!
    "False when the numbers would be refused: out of range, or the host would earn nothing."
    viable: Boolean!
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
    "Defaults to PHYSICAL. VIRTUAL requires meeting_url, pod_date_time and pod_end_date_time."
    pod_mode: PodMode
    meeting_platform: String
    meeting_url: String
    meeting_notes: String
    pod_date_time: String
    pod_end_date_time: String
    pod_amount: Float!
    no_of_spots: Int!
    pod_images_and_videos: [PodMediaInput!]!
    product_requests: [PodProductRequestInput!]
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
    pod_mode: PodMode
    meeting_platform: String
    meeting_url: String
    meeting_notes: String
    pod_date_time: String
    pod_end_date_time: String
    pod_amount: Float
    no_of_spots: Int
    pod_images_and_videos: [PodMediaInput!]
    product_requests: [PodProductRequestInput!]
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
    """
    Offers this venue owner may still accept, plus the ones they accepted.
    location_id narrows to offers pinned to that city — offers nobody has
    enrolled in yet have no city and are always included. venue_id narrows to
    what ONE of the caller's venues could accept (its category and city).
    """
    venueAutoPods(location_id: ID, venue_id: ID): [AutoPod!]!
    """
    The free slots one of the caller's venues could commit to an offer, in the
    next auto_pod_slot_window_days days, nearest first — each with what the
    venue would be paid after Finance's deductions.
    """
    autoPodVenueSlots(auto_pod_doc_id: ID!, venue_id: ID!): AutoPodVenueSlots!
    "What a ticket price and spot count would earn the CALLING host on this offer, plus the spot limits."
    autoPodHostProjection(auto_pod_doc_id: ID!, pod_amount: Float!, no_of_spots: Int!): AutoPodHostProjection!
    """
    Offers this host may still take (in a sub-category they are approved in),
    plus the ones they took. sub_category_id narrows to one of their categories;
    location_id as for venueAutoPods.
    """
    hostAutoPods(location_id: ID, sub_category_id: ID): [AutoPod!]!
    "Offers one of the caller's clubs may still claim, plus their claims."
    clubAdminAutoPods(location_id: ID): [AutoPod!]!
    "Per-role counts of Auto Pods waiting on the caller — drives role-switch landing."
    myAutoPodActionCounts: AutoPodActionCounts!
    """
    Admin only: who could enrol in a new Auto Pod of this sub-category — the
    venues hosting it, the hosts approved in it and the admins of clubs carrying
    it — with the counts the template form gates its next step on.
    """
    autoPodAudience(sub_category_id: ID!): AutoPodAudience!
  }

  extend type Mutation {
    """
    Opens an Auto Pod for the marketplace. A Duncit admin opens one for every
    club to compete for; a Club Admin passes club_id to open one FOR their own
    club, which enrols that club at creation (so only a venue and a host are
    still needed), fixes the category to the club's own and pins the offer to
    the club's city.
    """
    createAutoPod(input: CreateAutoPodInput!, club_id: ID): AutoPod!
    """
    Rewrites the template while the offer is not yet live. The economics are
    re-checked against whoever has already enrolled, and the category is locked
    once a host or a club is on it.
    """
    updateAutoPod(auto_pod_doc_id: ID!, input: UpdateAutoPodInput!): AutoPod!
    "Pulls a pre-live offer: everyone enrolled is told and the venue's slot is released."
    cancelAutoPod(auto_pod_doc_id: ID!, reason: String): AutoPod!
    """
    Pauses (false) or resumes (true) an offer still enrolling. Paused, it is
    shown to nobody and takes no claim; resumed, whoever is still missing is
    told again.
    """
    setAutoPodActive(auto_pod_doc_id: ID!, is_active: Boolean!): AutoPod!
    """
    Removes the record for good. Refused once the pod is live (delete the pod
    itself); a pre-live offer is cancelled first so its slot is released and
    everyone enrolled is told.
    """
    deleteAutoPod(auto_pod_doc_id: ID!): Boolean!
    "Venue enrols: accepts the offer and commits one of its own slots."
    venueAcceptAutoPod(auto_pod_doc_id: ID!, venue_id: ID!, slot_id: ID!): AutoPod!
    """
    Host enrols: assigns themselves, setting the pod's ticket price and spots
    (the template's when omitted). Only once a venue has fixed the slot on a
    physical offer. location_id is the city the host had selected — required
    when nobody has enrolled yet on a virtual offer (it pins it), and must
    match the pinned city otherwise.
    """
    hostAssignAutoPod(auto_pod_doc_id: ID!, location_id: ID, pod_amount: Float, no_of_spots: Int): AutoPod!
    "The venue takes its slot back while the offer is still enrolling; the offer returns to venues' lists and the venue pays the Pod Settings penalty."
    venueWithdrawAutoPod(auto_pod_doc_id: ID!): AutoPod!
    "The host steps off while the offer is still enrolling; the offer returns to hosts' lists and the host pays the Pod Settings penalty."
    hostWithdrawAutoPod(auto_pod_doc_id: ID!): AutoPod!
    "Club Admin enrols: claims the offer for one of their clubs."
    clubClaimAutoPod(auto_pod_doc_id: ID!, club_id: ID!): AutoPod!
  }
`;
