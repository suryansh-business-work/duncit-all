/** Reusable GraphQL fixtures for the mWeb Playwright suite. */

const DAY = 86_400_000;
export const future = (days: number) => new Date(Date.now() + days * DAY).toISOString();
export const past = (days: number) => new Date(Date.now() - days * DAY).toISOString();

export const branding = {
  app_name: 'Duncit',
  logo_url: null,
  primary_color: '#ff4f73',
  mascot_name: 'Dunko',
  mascot_description_html: '',
  mascot_image_url: null,
  mascot_lottie_url: null,
  app_loader_lottie_url: null,
  confetti_lottie_url: null,
  welcome_lottie_url: null,
};

export const me = {
  user_id: 'u1',
  full_name: 'Test User',
  first_name: 'Test',
  email: 'test@duncit.com',
  is_email_verified: true,
  profile_photo: null,
  city: 'Bengaluru',
  roles: ['USER'],
  following_pod_ids: [],
  following_user_ids: [],
};

export const superCategories = [
  { id: 'sc1', name: 'Play', slug: 'play', icon: null },
  { id: 'sc2', name: 'Learn', slug: 'learn', icon: null },
];

export const locations = [
  {
    id: 'loc1',
    location_id: 'blr',
    location_name: 'Bengaluru',
    location_image: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    state_code: 'KA',
    country: 'India',
    country_code: 'IN',
    location_pincode: '560001',
    location_zones: [{ zone_name: 'Indiranagar', pincode: '560038' }],
  },
];

export const categories = [
  { id: 'cat1', name: 'Music', slug: 'music', level: 'CATEGORY', parent_id: 'sc1' },
  { id: 'cat2', name: 'Sports', slug: 'sports', level: 'CATEGORY', parent_id: 'sc1' },
];

export const clubs = [
  {
    id: 'club1',
    club_id: 'jazz-club',
    club_name: 'Jazz Club',
    club_description: 'Live jazz every weekend',
    club_feature_images_and_videos: [{ url: 'https://img/jazz.jpg', type: 'IMAGE' }],
    club_moments: [],
    category_id: 'cat1',
    super_category_id: 'sc1',
  },
];

const podBase = {
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  pod_attendees: ['a1'],
  no_of_spots: 10,
  pod_hosts_id: ['h1'],
  host_names: ['Asha'],
  pod_images_and_videos: [{ url: 'https://img/pod.jpg', type: 'IMAGE' }],
  club_id: 'club1',
  club_slug: 'jazz-club',
  location_id: 'loc1',
  zone_name: 'Indiranagar',
  place_label: 'Indiranagar',
  place_detail: 'Bengaluru',
};

export const upcomingPod = {
  ...podBase,
  id: 'pod-up',
  pod_id: 'sunset-jam',
  pod_title: 'Sunset Jam',
  pod_date_time: future(2),
};

export const previousPod = {
  ...podBase,
  id: 'pod-old',
  pod_id: 'old-gig',
  pod_title: 'Old Gig',
  pod_date_time: past(3),
};

export const publicHosts = [{ user_id: 'h1', full_name: 'Asha' }];

export const stories = [
  {
    id: 'st1',
    author_id: 'u2',
    image_url: 'https://img/story.jpg',
    media_type: 'IMAGE',
    caption: 'Great night',
    created_at: future(0),
  },
];

/** The AppHeader boot query — branding, me, super categories, locations. */
export const appHeader = {
  branding,
  me,
  superCategories,
  locations,
  activePodLocationIds: ['loc1'],
};

/** The HomeFeed query — pods + clubs + categories + stories for the home shell. */
export function homeFeed(over: Partial<{ pods: unknown[] }> = {}) {
  return {
    sliders: [],
    clubs,
    pods: over.pods ?? [upcomingPod, previousPod],
    publicHosts,
    categories,
    stories,
  };
}

/** A single pod for the Pod Detail page (PodDetails query → `pod`). */
export const podDetail = {
  id: 'pod-up',
  pod_id: 'sunset-jam',
  pod_title: 'Sunset Jam',
  pod_description: 'An evening of live jazz.',
  pod_info: '',
  pod_hashtag: ['jazz'],
  pod_images_and_videos: [{ url: 'https://img/pod.jpg', type: 'IMAGE' }],
  pod_hits: 5,
  pod_hosts_id: ['h1'],
  pod_attendees: ['a1'],
  pod_date_time: future(2),
  pod_end_date_time: null,
  pod_mode: 'PHYSICAL',
  meeting_platform: null,
  meeting_url: null,
  meeting_notes: null,
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  pod_occurrence: 'ONE_TIME',
  no_of_spots: 10,
  zone_name: 'Indiranagar',
  club_id: 'club1',
  club_slug: 'jazz-club',
  location_id: 'loc1',
  venue_id: null,
  what_this_pod_offers: ['Live band'],
  available_perks: [],
  payment_terms: null,
  place_charges: [],
  products_enabled: false,
  product_requests: [],
  host_names: ['Asha'],
  place_label: 'Indiranagar',
  place_detail: 'Bengaluru',
  liked_by_me: false,
  like_count: 3,
  comment_count: 0,
  saved_by_me: false,
  following: false,
};

export const product = {
  product_id: 'prod1',
  product_name: 'Vinyl Record',
  unit_cost: 499,
  available_count: 8,
  image_url: 'https://img/vinyl.jpg',
  images: [],
};

/** PodDetails query — pod + the clubs/venues/hosts the page joins against. */
export function podDetails(over: Record<string, unknown> = {}) {
  return {
    pod: { ...podDetail, ...over },
    clubs,
    locations,
    publicVenues: [],
    publicHosts,
    me,
  };
}

/** Boot fixtures for the Pod Detail route (/club/:slug/pod/:slug). */
export function podDetailFixtures(over: Record<string, unknown> = {}) {
  return {
    MwebSessionMe: { me },
    MwebPublicClientConfig: { publicClientConfig: { google_client_id: '', google_maps_api_key: 'e2e-maps-key' } },
    AppHeader: appHeader,
    PodIdBySlugs: { podBySlugs: { id: 'pod-up', pod_id: 'sunset-jam', club_slug: 'jazz-club' } },
    PodDetails: podDetails(over),
    PodPeople: { pod: { pod_attendees_users: [] } },
    PodComments: { podComments: [] },
    MyNotifications: { myNotifications: [], myUnreadNotificationCount: 0 },
    PublicPoliciesNav: { publicPolicies: [] },
  };
}

/** Explore reels — ExplorePods returns me + pods + clubs + categories. */
export const explorePod = {
  ...upcomingPod,
  pod_description: 'An evening of live jazz.',
  pod_mode: 'PHYSICAL',
  like_count: 4,
  liked_by_me: false,
  comment_count: 0,
  venue_id: null,
};

export function exploreFixtures(over: { pods?: unknown[] } = {}) {
  return {
    MwebSessionMe: { me },
    MwebPublicClientConfig: { publicClientConfig: { google_client_id: '', google_maps_api_key: 'e2e-maps-key' } },
    AppHeader: appHeader,
    ExplorePods: {
      me: { ...me, saved_pod_ids: [] },
      pods: over.pods ?? [explorePod],
      clubs,
      superCategories,
      categories,
      locations,
    },
    PodComments: { podComments: [] },
    MyNotifications: { myNotifications: [], myUnreadNotificationCount: 0 },
    PublicPoliciesNav: { publicPolicies: [] },
  };
}

/** Common boot fixtures shared by all authed pages. */
export const bootFixtures = {
  // UserProvider's loadUser — returning null pops a "User data not loaded" modal.
  MwebSessionMe: { me },
  MwebPublicClientConfig: { publicClientConfig: { google_client_id: '', google_maps_api_key: 'e2e-maps-key' } },
  AppHeader: appHeader,
  HomeFeed: homeFeed(),
  MyNotifications: { myNotifications: [], myUnreadNotificationCount: 0 },
  PublicPoliciesNav: { publicPolicies: [] },
  HomeFollowedUsers: { publicUsersByIds: [] },
};
