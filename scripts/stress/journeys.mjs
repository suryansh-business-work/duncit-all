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
 * page (see ./queries), so the server does the same work a real visit costs.
 *
 * Most mWeb pages are signed-in only in the BROWSER (the client redirects to
 * /login), but their load queries answer a signed-out caller and their HTML is
 * still rendered by the mWeb server, so an HTTP bot costs what a visit costs.
 *
 * A detail journey walks one random real record per iteration, drawn from the
 * seed pool it `needs` (skipped when that pool is empty) or `uses` (its record
 * steps are skipped instead, via `when`).
 */
import * as D from './queries/discovery.mjs';
import * as P from './queries/details.mjs';
import * as Q from './queries/public.mjs';
import { pickFrom } from './seeds.mjs';

/** Search terms a visitor might type — varied so the search cache is not the only thing tested. */
const SEARCH_TERMS = ['music', 'run', 'yoga', 'football', 'art', 'food', 'games', 'tech', 'dance', 'books'];
const randomTerm = () => SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];

/** A page GET. `pattern` names the endpoint in the totals; `build` fills it with this walk's record. */
const page = (pattern, build = () => pattern) => ({ kind: 'page', key: `page ${pattern}`, path: build });
const graphql = (operationName, query, variables = () => ({}), when = null) => ({
  kind: 'graphql',
  key: `gql ${operationName}`,
  operationName,
  query,
  variables,
  when,
});

const enc = encodeURIComponent;
const podPath = (pod) => `/club/${enc(pod.club_slug)}/pod/${enc(pod.pod_id)}`;
const podPeople = (pod) => [...(pod.pod_hosts_id ?? []), ...(pod.pod_attendees ?? [])];
const hasRecord = (record) => record !== null;

export const JOURNEYS = {
  app_boot: {
    page: () => '/login',
    steps: [
      page('/login'),
      graphql('MwebPublicClientConfig', Q.PUBLIC_CLIENT_CONFIG),
      graphql('PortalMode', Q.PORTAL_MODE, () => ({ key: 'mweb' })),
      graphql('PublicLocales', Q.PUBLIC_LOCALES),
      graphql('PublicTranslations', Q.PUBLIC_TRANSLATIONS, () => ({ locale: 'en-IN' })),
      graphql('PublicAppSettings', Q.PUBLIC_APP_SETTINGS),
      graphql('BrandingAssets', Q.BRANDING_ASSETS),
      graphql('MwebBrandFont', Q.BRAND_FONT),
      graphql('TourViewer', Q.TOUR_VIEWER),
      graphql('PublicFeatureFlags', Q.PUBLIC_FEATURE_FLAGS),
    ],
  },
  auth: {
    page: () => '/register',
    steps: [
      page('/login'),
      graphql('AuthBranding', Q.AUTH_BRANDING),
      page('/register'),
      graphql('SignupPolicies', Q.SIGNUP_POLICIES),
      page('/forgot-password'),
    ],
  },
  home: {
    page: () => '/',
    steps: [
      page('/'),
      graphql('PublicFeatureFlags', Q.PUBLIC_FEATURE_FLAGS),
      graphql('AppHeaderStatic', D.APP_HEADER_STATIC),
      graphql('HomeFeedStatic', D.HOME_FEED_STATIC),
      graphql('HomeFeedLive', D.HOME_FEED_LIVE, () => ({ podFilter: { is_active: true } })),
    ],
  },
  explore: {
    page: () => '/explore',
    steps: [page('/explore'), graphql('ExplorePods', D.EXPLORE_PODS)],
  },
  clubs: {
    page: () => '/clubs',
    steps: [page('/clubs'), graphql('AllClubs', D.ALL_CLUBS)],
  },
  search: {
    page: () => '/search',
    steps: [page('/search'), graphql('SearchDiscovery', D.SEARCH_DISCOVERY, () => ({ input: { query: randomTerm() } }))],
  },
  venues: {
    page: () => '/venues',
    steps: [
      page('/venues'),
      graphql('VenuesExplore', D.VENUES_EXPLORE),
      graphql('VenuesSuperCategories', D.VENUES_SUPER_CATEGORIES),
      graphql('VenuesLocationNames', D.VENUES_LOCATION_NAMES),
    ],
  },
  happening_nearby: {
    page: () => '/happening-nearby',
    steps: [
      page('/happening-nearby'),
      graphql('AppHeaderStatic', D.APP_HEADER_STATIC),
      graphql('HomeFeedStatic', D.HOME_FEED_STATIC),
      graphql('HomeFeedLive', D.HOME_FEED_LIVE, () => ({ podFilter: { is_active: true } })),
      graphql('ActiveAds', D.ACTIVE_ADS, () => ({ position: 'POD_LIST' })),
    ],
  },
  pod_detail: {
    needs: 'pods',
    page: podPath,
    steps: [
      page('/club/:clubSlug/pod/:podSlug', podPath),
      graphql('PodIdBySlugs', P.POD_ID_BY_SLUGS, (pod) => ({ clubSlug: pod.club_slug, podSlug: pod.pod_id })),
      graphql('PodDetails', P.POD_DETAILS, (pod) => ({ id: pod.id })),
      graphql('PodPeople', P.POD_PEOPLE, (pod) => ({ ids: podPeople(pod) }), (pod) => podPeople(pod).length > 0),
      graphql('PodSpotFills', P.POD_SPOT_FILLS, (pod) => ({ id: pod.id })),
      graphql('PodAttendeeSeats', P.POD_ATTENDEE_SEATS, (pod) => ({ id: pod.id })),
      graphql('ActiveAds', D.ACTIVE_ADS, () => ({ position: 'POD_DETAILS' })),
      graphql('PublicFinanceSettingsForPricing', P.PRICING_SETTINGS),
    ],
  },
  club_detail: {
    needs: 'clubs',
    page: (club) => `/club/${enc(club.club_id)}`,
    steps: [
      page('/club/:clubSlug', (club) => `/club/${enc(club.club_id)}`),
      graphql('ClubBySlug', P.CLUB_BY_SLUG, (club) => ({ slug: club.club_id })),
      graphql('ClubDetailsRelated', P.CLUB_DETAILS_RELATED, (club) => ({ id: club.id })),
      graphql('CategoryTree', P.CATEGORY_TREE),
      graphql('ClubStories', P.CLUB_STORIES, (club) => ({ id: club.id })),
      graphql('ClubRatings', P.CLUB_RATINGS, (club) => ({ id: club.id })),
      graphql('LocationMismatchNames', P.LOCATION_NAMES),
    ],
  },
  venue_detail: {
    needs: 'venues',
    page: (venue) => `/venue/${enc(venue.id)}`,
    steps: [
      page('/venue/:venueId', (venue) => `/venue/${enc(venue.id)}`),
      graphql('PublicVenueDetails', P.PUBLIC_VENUE_DETAILS),
      graphql('VenueHostedPods', P.VENUE_HOSTED_PODS, (venue) => ({ venueId: venue.id })),
      graphql('PublicFinanceSettingsForPricing', P.PRICING_SETTINGS),
      graphql('LocationMismatchNames', P.LOCATION_NAMES),
    ],
  },
  profile: {
    needs: 'hosts',
    page: (host) => `/u/${enc(host.user_id)}`,
    steps: [
      page('/u/:handle', (host) => `/u/${enc(host.user_id)}`),
      graphql('PublicProfile', P.PUBLIC_PROFILE, (host) => ({ user_id: host.user_id })),
      graphql('UserBadgesPublic', P.USER_BADGES_PUBLIC, (host) => ({ user_id: host.user_id })),
      graphql('PublicUserPosts', P.PUBLIC_USER_POSTS, (host) => ({ id: host.user_id })),
    ],
  },
  hosts_venues: {
    page: () => '/hosts-venues',
    steps: [page('/hosts-venues'), graphql('PublicHosts', D.PUBLIC_HOSTS), graphql('PublicVenues', D.PUBLIC_VENUES)],
  },
  pod_ideas: {
    page: () => '/pod-ideas',
    steps: [page('/pod-ideas'), graphql('PodIdeas', Q.POD_IDEAS, () => ({ filter: { status: 'APPROVED' } }))],
  },
  membership: {
    page: () => '/membership',
    steps: [
      page('/pod-plans'),
      graphql('PublicPodPlans', Q.PUBLIC_POD_PLANS),
      page('/membership'),
      graphql('MembershipPricing', Q.MEMBERSHIP_PRICING),
    ],
  },
  leaderboard: {
    page: () => '/leaderboard',
    steps: [page('/leaderboard'), graphql('LeaderboardConfig', Q.LEADERBOARD_CONFIG)],
  },
  gift_cards: {
    page: () => '/gift-cards',
    steps: [
      page('/gift-cards'),
      graphql('GiftCardCategories', Q.GIFT_CARD_CATEGORIES),
      graphql('PublicFinanceSettings', Q.PUBLIC_FINANCE_SETTINGS),
    ],
  },
  help: {
    // A policy is a bonus, not a requirement: with none published the FAQ half still walks.
    uses: 'policies',
    page: () => '/faqs',
    steps: [
      page('/faqs'),
      graphql('PublicFaqs', Q.PUBLIC_FAQS),
      graphql('GrievanceOfficer', Q.GRIEVANCE_OFFICER),
      { ...page('/policies/:slug', (policy) => `/policies/${enc(policy.slug)}`), when: hasRecord },
      graphql('PolicyBySlug', Q.POLICY_BY_SLUG, (policy) => ({ slug: policy.slug }), hasRecord),
    ],
  },
  api_health: {
    page: null,
    steps: [{ kind: 'get', key: 'GET /health', path: '/health' }],
  },
};

/**
 * The requested journeys, or a thrown error naming the ones this runner cannot
 * walk. Each carries `pick()`, which hands a walk its record (null when the
 * journey needs none), and `page()` for the browser bots.
 */
export function resolveJourneys(names) {
  const unknown = names.filter((name) => !JOURNEYS[name]);
  if (unknown.length > 0) {
    throw new Error(`This runner has no steps for journey(s): ${unknown.join(', ')}`);
  }
  if (names.length === 0) throw new Error('The run names no journeys.');
  return names.map((name) => {
    const journey = JOURNEYS[name];
    const pool = journey.needs ?? journey.uses;
    const pick = pool ? () => pickFrom(pool) : () => null;
    const browserPage = journey.page ? () => journey.page(pick()) : null;
    return { name, needs: journey.needs ?? null, pool: pool ?? null, steps: journey.steps, pick, page: browserPage };
  });
}

/** Splits journeys into the ones the loaded seeds can walk and the ones whose pool came back empty. */
export function walkable(journeys) {
  const ready = journeys.filter((j) => !j.needs || pickFrom(j.needs) !== null);
  const empty = journeys.filter((j) => j.needs && pickFrom(j.needs) === null);
  return { ready, empty };
}
