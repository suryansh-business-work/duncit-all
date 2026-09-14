/**
 * What a stress bot does, journey by journey.
 *
 * The NAMES are mirrored in `server/src/modules/platform/stressTest/
 * stressTest.journeys.ts`, which validates what the portal may ask for; the
 * STEPS live only here because this is the code that sends them. `resolveJourneys`
 * refuses a name it has no steps for, so a journey added on one side and not the
 * other fails the run at its first second instead of doing nothing quietly.
 *
 * Every step is READ-ONLY and anonymous — a run may target production, and
 * nothing a bot does may create a booking, a message or a row a real person
 * would later see. The GraphQL documents are the ones mWeb sends on the same
 * page (app/mweb/src/pages/*), so the server does the same work a real visit
 * costs, including the feed's relation priming.
 */

const HOME_FEED_STATIC = `query HomeFeedStatic {
  clubs(filter: { is_active: true }) {
    id club_id club_name club_description
    club_feature_images_and_videos { url type }
    club_moments { url type }
    category_id super_category_id followers_count is_verified location_id
  }
  publicHosts { user_id full_name }
  categories { id name slug icon level parent_id icon_layout_mweb { position width height } }
}`;

const HOME_FEED_LIVE = `query HomeFeedLive($podFilter: PodFilterInput) {
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

const PUBLIC_FEATURE_FLAGS = `query PublicFeatureFlags { publicFeatureFlags { key enabled } }`;

const EXPLORE_PODS = `query ExplorePods {
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

const ALL_CLUBS = `query AllClubs($locationId: ID, $locality: String) {
  superCategories: categories(filter: { level: SUPER }) { id slug }
  locations { id location_name }
  clubs(filter: { is_active: true, location_id: $locationId, locality: $locality }) {
    id club_id club_name club_description category_id super_category_id
    club_feature_images_and_videos { url type }
  }
  pods(filter: { is_active: true }) { id club_id }
}`;

const SEARCH_DISCOVERY = `query SearchDiscovery($input: SearchDiscoveryInput) {
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

const PUBLIC_VENUES = `query PublicVenues {
  publicVenues {
    id owner_user_id venue_name venue_type capacity description cover_image_url
    country city state locality postal_code amenities tags
  }
}`;

/** Search terms a visitor might type — varied so the search cache is not the only thing tested. */
const SEARCH_TERMS = ['music', 'run', 'yoga', 'football', 'art', 'food', 'games', 'tech', 'dance', 'books'];

const page = (path) => ({ kind: 'page', key: `page ${path}`, path });
const graphql = (operationName, query, variables = () => ({})) => ({
  kind: 'graphql',
  key: `gql ${operationName}`,
  operationName,
  query,
  variables,
});

export const JOURNEYS = {
  home: {
    page: '/',
    steps: [
      page('/'),
      graphql('PublicFeatureFlags', PUBLIC_FEATURE_FLAGS),
      graphql('HomeFeedStatic', HOME_FEED_STATIC),
      graphql('HomeFeedLive', HOME_FEED_LIVE, () => ({ podFilter: { is_active: true } })),
    ],
  },
  explore: {
    page: '/explore',
    steps: [page('/explore'), graphql('ExplorePods', EXPLORE_PODS)],
  },
  clubs: {
    page: '/clubs',
    steps: [page('/clubs'), graphql('AllClubs', ALL_CLUBS)],
  },
  search: {
    page: '/search',
    steps: [
      page('/search'),
      graphql('SearchDiscovery', SEARCH_DISCOVERY, () => ({
        input: { query: SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)] },
      })),
    ],
  },
  venues: {
    page: '/venues',
    steps: [page('/venues'), graphql('PublicVenues', PUBLIC_VENUES)],
  },
  api_health: {
    page: null,
    steps: [{ kind: 'health', key: 'GET /health' }],
  },
};

/** The requested journeys, or a thrown error naming the ones this runner cannot walk. */
export function resolveJourneys(names) {
  const unknown = names.filter((name) => !JOURNEYS[name]);
  if (unknown.length > 0) {
    throw new Error(`This runner has no steps for journey(s): ${unknown.join(', ')}`);
  }
  if (names.length === 0) throw new Error('The run names no journeys.');
  return names.map((name) => ({ name, ...JOURNEYS[name] }));
}
