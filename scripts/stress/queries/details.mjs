/**
 * The GraphQL documents of mWeb's detail pages — one pod, one club, one venue,
 * one person. Each is walked with a real id from the seed pool (see seeds.mjs),
 * so the server resolves a real record rather than a cached miss.
 *
 * The write a detail page also fires (`IncPodHits`) is deliberately left out:
 * a stress run must not move a counter a real person reads.
 */

// app/mweb/src/pages/pod-details-page/queries.ts
export const POD_ID_BY_SLUGS = `query PodIdBySlugs($clubSlug: String!, $podSlug: String!) {
  podBySlugs(club_slug: $clubSlug, pod_slug: $podSlug) { id pod_id club_slug }
}`;

export const POD_DETAILS = `query PodDetails($id: ID!) {
  pod(pod_doc_id: $id) {
    id pod_id pod_title pod_description pod_info pod_hashtag
    pod_images_and_videos { url type }
    pod_hits pod_hosts_id pod_attendees pod_date_time pod_end_date_time pod_mode
    meeting_platform meeting_url meeting_notes pod_type pod_amount pod_occurrence
    no_of_spots seats_taken seats_available zone_name club_id club_slug
    club { club_admins { id name avatar_url email phone whatsapp } }
    location_id venue_id place_label place_detail what_this_pod_offers available_perks payment_terms
    place_charges { label amount note }
    products_enabled
    product_requests { product_id product_name image_url images unit_cost quantity available_count total_cost free_delivery_above }
    product_cost_total like_count liked_by_me comment_count
  }
  podMembershipState(pod_doc_id: $id) {
    pod_id is_member status can_backout can_join spots_taken spots_total seats_available max_seats_per_booking
    my_seats refund_threshold_pct backout_in_process can_cancel_backout backout_attempts_used backout_attempts_max
    backout_deduction_pct backout_refund_amount backout_refund_coins backout_refund_per_seat released_seats_pending
    membership { id status seats referral_token refund_status }
  }
  clubs {
    id club_id club_name club_description category_id super_category_id
    club_feature_images_and_videos { url type }
    club_moments { url type }
  }
  categories { id name level parent_id }
  locations { id location_name location_image location_pincode location_zones { zone_name pincode } }
  publicVenues { id venue_name address_line1 address_line2 locality city state country postal_code lat lng }
  publicHosts { id user_id full_name passport_photo_url }
  me { user_id saved_pod_ids }
}`;

export const POD_PEOPLE = `query PodPeople($ids: [ID!]!) { publicUsersByIds(user_ids: $ids) { user_id full_name profile_photo } }`;

export const POD_SPOT_FILLS = `query PodSpotFills($id: ID!) {
  podSpotFills(pod_doc_id: $id) {
    backout_no backed_out_user_id backed_out_user_name backed_out_profile_photo
    replacement_user_id replacement_user_name filled_at
  }
}`;

export const POD_ATTENDEE_SEATS = `query PodAttendeeSeats($id: ID!) { podAttendeeSeats(pod_doc_id: $id) { user_id seats } }`;

// app/mweb/src/hooks/usePricing.ts · hooks/useLocationMismatch.ts
export const PRICING_SETTINGS = `query PublicFinanceSettingsForPricing {
  publicFinanceSettings { platform_fee_pct gst_pct currency_symbol default_backout_deduction_pct }
}`;

export const LOCATION_NAMES = `query LocationMismatchNames { locations { id location_name } }`;

// app/mweb/src/pages/ClubDetailsPage/clubDetailsQueries.ts
export const CLUB_BY_SLUG = `query ClubBySlug($slug: String!) {
  clubBySlug(club_slug: $slug) {
    id club_id club_name location_id locality club_description
    club_feature_images_and_videos { url type }
    club_moments { url type }
    who_we_are what_we_do perks values
    faqs { question answer }
    club_whats_app_community_link club_whats_app_announcement_link club_whats_app_group_link
    matched_venues { id venue_name address_line1 address_line2 locality city state country postal_code lat lng }
    followers_count rating ratings_count
    hosts { id name avatar_url }
    club_admins { id name avatar_url email phone whatsapp }
    category_id super_category_id
  }
}`;

export const CLUB_DETAILS_RELATED = `query ClubDetailsRelated($id: ID!) {
  me { user_id following_user_ids }
  clubPods: pods(filter: { club_id: $id, is_active: true }) {
    id pod_id pod_title pod_date_time pod_end_date_time pod_type pod_amount pod_attendees seats_taken no_of_spots
    place_label place_detail club_slug pod_images_and_videos { url type }
  }
}`;

export const CATEGORY_TREE = `query CategoryTree { categories { id name level parent_id } }`;

export const CLUB_STORIES = `query ClubStories($id: ID!) {
  clubStories(club_id: $id) {
    id expires_at image_url media_type caption created_at seen_by_me can_delete
    author { user_id full_name profile_photo }
  }
}`;

export const CLUB_RATINGS = `query ClubRatings($id: ID!) {
  clubRatings(club_doc_id: $id) { id user_id user_name user_photo stars comment created_at }
}`;

// app/mweb/src/pages/VenueDetailsPage.tsx · venues-page/VenuePodsSection.tsx
export const PUBLIC_VENUE_DETAILS = `query PublicVenueDetails {
  publicVenues {
    id venue_name venue_type capacity description location_id amenities facilities security
    cover_image_url gallery address_line1 address_line2 city state locality postal_code country lat lng tags
  }
}`;

export const VENUE_HOSTED_PODS = `query VenueHostedPods($venueId: ID!) {
  pods(filter: { venue_id: $venueId, is_active: true }) {
    id pod_id pod_title pod_date_time pod_end_date_time pod_type pod_amount pod_attendees no_of_spots host_names
    pod_images_and_videos { url type } club_id club_slug pod_mode place_label place_detail
  }
}`;

// app/mweb/src/pages/public-profile-page
export const PUBLIC_PROFILE = `query PublicProfile($user_id: ID!) {
  publicUserProfile(user_id: $user_id) {
    user_id username full_name first_name last_name profile_photo bio city zone followers_count following_count
    is_private is_following follow_status follows_viewer inbound_request_id can_view_content is_host
  }
  me { user_id following_user_ids }
}`;

export const USER_BADGES_PUBLIC = `query UserBadgesPublic($user_id: ID!) {
  userBadges(user_id: $user_id) {
    id awarded_at awarded_reason
    badge { id title description image_url condition_type threshold }
  }
}`;

export const PUBLIC_USER_POSTS = `query PublicUserPosts($id: ID!) {
  posts(author_id: $id) { id image_url caption likes_count comments_count }
  stories(author_id: $id) { id image_url media_type caption created_at expires_at }
}`;
