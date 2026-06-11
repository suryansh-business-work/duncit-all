/** Reusable GraphQL fixtures for the mobile-App (Expo web) Playwright suite. */

const DAY = 86_400_000;
export const future = (days: number) => new Date(Date.now() + days * DAY).toISOString();
export const past = (days: number) => new Date(Date.now() - days * DAY).toISOString();

export const me = {
  user_id: 'u1',
  full_name: 'Test User',
  first_name: 'Test',
  last_name: 'User',
  email: 'test@duncit.com',
  is_email_verified: true,
  profile_photo: null,
  roles: ['USER'],
  city: 'Bengaluru',
  following_pod_ids: [],
  following_user_ids: [],
  saved_pod_ids: [],
};

export const branding = {
  app_name: 'Duncit',
  logo_url: null,
  primary_color: '#ff4f73',
  mascot_name: 'Dunko',
  mascot_image_url: null,
};

export const superCategories = [
  { id: 'sc1', name: 'Play', slug: 'play', icon: null },
  { id: 'sc2', name: 'Learn', slug: 'learn', icon: null },
];

export const categories = [
  { id: 'cat1', name: 'Music', slug: 'music', level: 'CATEGORY', parent_id: 'sc1', category_id: 'cat1' },
];

export const clubs = [
  {
    id: 'club1',
    club_id: 'jazz-club',
    club_name: 'Jazz Club',
    club_description: 'Live jazz every weekend',
    club_feature_images_and_videos: [{ url: 'https://img/jazz.jpg', type: 'IMAGE' }],
    category_id: 'cat1',
    super_category_id: 'sc1',
  },
];

const podBase = {
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  pod_attendees: ['a1'],
  no_of_spots: 10,
  host_names: ['Asha'],
  pod_images_and_videos: [{ url: 'https://img/pod.jpg', type: 'IMAGE' }],
  club_id: 'club1',
  club_slug: 'jazz-club',
  location_id: 'loc1',
  pod_mode: 'PHYSICAL',
  place_label: 'Indiranagar',
  place_detail: 'Bengaluru',
};

export const upcomingPod = { ...podBase, id: 'pod-up', pod_id: 'sunset-jam', pod_title: 'Sunset Jam', pod_date_time: future(2) };
export const previousPod = { ...podBase, id: 'pod-old', pod_id: 'old-gig', pod_title: 'Old Gig', pod_date_time: past(3) };

export const locations = [
  {
    id: 'loc1',
    location_name: 'Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    state_code: 'KA',
    country: 'India',
    country_code: 'IN',
    location_image: '',
    location_pincode: '560001',
    location_zones: [{ zone_name: 'Indiranagar', pincode: '560038' }],
  },
];

export const story = {
  id: 'st1',
  author_id: 'u2',
  author: { user_id: 'u2', full_name: 'Asha', profile_photo: null },
  image_url: 'https://img/story.jpg',
  media_type: 'IMAGE',
  caption: 'Great night',
  created_at: future(0),
};

/** Boot fixtures for the signed-in Home tab. */
export function homeFixtures(over: { pods?: unknown[]; stories?: unknown[] } = {}) {
  return {
    MobileMe: { me },
    MobileBranding: { branding },
    MobileSuperCategories: { categories: superCategories },
    MobileLocations: { locations, activePodLocationIds: ['loc1'] },
    MobileHomeFeed: { categories, clubs, pods: over.pods ?? [upcomingPod, previousPod] },
    MobileStatusFeed: { stories: over.stories ?? [], myStories: [] },
    MobileNotifications: { myNotifications: [], myUnreadNotificationCount: 0 },
  };
}

/** Explore reels feed. */
export const explorePod = {
  ...upcomingPod,
  pod_description: 'An evening of live jazz.',
  like_count: 4,
  liked_by_me: false,
  comment_count: 0,
  zone_name: 'Indiranagar',
};

export function exploreFixtures(over: { pods?: unknown[] } = {}) {
  return {
    MobileMe: { me },
    MobileBranding: { branding },
    MobileSuperCategories: { categories: superCategories },
    MobileLocations: { locations, activePodLocationIds: ['loc1'] },
    MobileExplorePods: {
      me: { ...me, saved_pod_ids: [] },
      pods: over.pods ?? [explorePod],
      clubs,
      superCategories,
      categories,
      locations,
    },
    MobilePodComments: { podComments: [] },
  };
}
