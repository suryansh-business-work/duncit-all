/**
 * The GraphQL documents of mWeb's discovery pages — home, explore, clubs,
 * search, venues, happening nearby, hosts & venues. Copied from the page that
 * sends them (the path is named above each), so a bot costs the server what a
 * real visit does. When mWeb changes a document, change it here too.
 */

// app/mweb/src/pages/home — useHomeData
export const HOME_FEED_STATIC = `query HomeFeedStatic {
  clubs(filter: { is_active: true }) {
    id club_id club_name club_description
    club_feature_images_and_videos { url type }
    club_moments { url type }
    category_id super_category_id followers_count is_verified location_id
  }
  publicHosts { user_id full_name }
  categories { id name slug icon level parent_id icon_layout_mweb { position width height } }
}`;

export const HOME_FEED_LIVE = `query HomeFeedLive($podFilter: PodFilterInput) {
  pods(filter: $podFilter) {
    id pod_id pod_title pod_date_time pod_end_date_time pod_type pod_amount
    pod_attendees seats_taken no_of_spots pod_hosts_id host_names
    pod_images_and_videos { url type }
    club_id club_slug location_id zone_name place_label place_detail
  }
  stories {
    id author_id club_id image_url media_type caption created_at expires_at
    seen_by_me liked_by_me likes_count views_count
  }
}`;

// app/mweb/src/components/app-header/queries.ts
export const APP_HEADER_STATIC = `query AppHeaderStatic {
  branding {
    app_name logo_url mweb_logo_url primary_color home_all_vibe_icon_url
    home_all_vibe_icon_layout { position width height }
    home_show_all_vibe_categories home_vibe_heading home_vibe_subheading home_header_tagline
  }
  superCategories: categories(filter: { level: SUPER }) { id name slug icon description }
  locations {
    id location_id location_name location_image city state state_code country country_code
    location_pincode active_club_count location_zones { zone_name pincode active_club_count }
  }
  activePodLocationIds
}`;

// app/mweb/src/components/ads/useActiveAds.ts
export const ACTIVE_ADS = `query ActiveAds($position: AdPosition!) {
  activeAds(position: $position) { id ad_type media_url redirect_url ad_title position }
}`;

// app/mweb/src/pages/explore
export const EXPLORE_PODS = `query ExplorePods {
  pods(filter: { is_active: true, has_reel: true }) {
    id pod_id pod_title pod_description pod_date_time pod_type pod_amount
    pod_attendees seats_taken no_of_spots zone_name reel_url club_id club_slug
    location_id pod_mode venue_id place_label place_detail like_count liked_by_me
    liked_user_ids comment_count
  }
  clubs(filter: { is_active: true }) { id club_id club_name is_verified super_category_id category_id }
  superCategories: categories(filter: { level: SUPER }) { id slug }
  categories { id name slug level parent_id }
  locations { id location_name }
}`;

// app/mweb/src/pages/ClubsPage.tsx
export const ALL_CLUBS = `query AllClubs($locationId: ID, $locality: String) {
  superCategories: categories(filter: { level: SUPER }) { id slug }
  locations { id location_name }
  clubs(filter: { is_active: true, location_id: $locationId, locality: $locality }) {
    id club_id club_name club_description category_id super_category_id
    club_feature_images_and_videos { url type }
  }
  pods(filter: { is_active: true }) { id club_id }
}`;

// app/mweb/src/pages/search
export const SEARCH_DISCOVERY = `query SearchDiscovery($input: SearchDiscoveryInput) {
  searchDiscovery(input: $input) {
    query
    happening { ...SearchClubResultFields }
    more_clubs { ...SearchClubResultFields }
  }
}
fragment SearchClubResultFields on SearchClubResult {
  is_following participant_count next_pod_date
  club {
    id club_id club_name club_description followers_count category_id super_category_id
    club_feature_images_and_videos { url type }
  }
  upcoming_pods {
    id pod_id club_slug pod_title pod_date_time pod_amount pod_type no_of_spots
    pod_attendees seats_taken host_names place_label place_detail
    pod_images_and_videos { url type }
  }
}`;

// app/mweb/src/pages/venues-page/index.tsx
export const VENUES_EXPLORE = `query VenuesExplore($location_id: ID, $search: String, $super_category_id: ID) {
  publicVenues(location_id: $location_id, search: $search, super_category_id: $super_category_id) {
    id venue_name venue_type capacity cover_image_url gallery city locality pod_count
  }
}`;

export const VENUES_SUPER_CATEGORIES = `query VenuesSuperCategories {
  superCategories: categories(filter: { level: SUPER }) { id slug }
}`;

export const VENUES_LOCATION_NAMES = `query VenuesLocationNames { locations { id location_name } }`;

// app/mweb/src/pages/hosts-venues-page/queries.ts
export const PUBLIC_HOSTS = `query PublicHosts {
  me { user_id following_user_ids requested_user_ids }
  publicHosts { id user_id full_name email passport_photo_url full_address tags approved_at }
}`;

export const PUBLIC_VENUES = `query PublicVenues {
  publicVenues {
    id owner_user_id venue_name venue_type capacity description cover_image_url
    country city state locality postal_code amenities tags
  }
}`;
