/** Reusable GraphQL fixtures for the mWeb Cypress suite. */

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

/**
 * The home feed is TWO documents: HomeFeedStatic (the cacheable catalogue —
 * clubs, hosts, categories) and HomeFeedLive (pods + stories). `useHomeData`
 * merges them, so a spec that overrides the pods overrides the live half only.
 */
export const homeStatic = { clubs, publicHosts, categories };

export function homeLive(over: Partial<{ pods: unknown[]; stories: unknown[] }> = {}) {
  return {
    pods: over.pods ?? [upcomingPod, previousPod],
    stories: over.stories ?? stories,
  };
}

/** Both halves, keyed by operation name, for a spec that swaps the whole feed. */
export function homeFeed(over: Partial<{ pods: unknown[]; stories: unknown[] }> = {}) {
  return { HomeFeedStatic: homeStatic, HomeFeedLive: homeLive(over) };
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

/** The Pod Shop section is gated behind the `is_product_visible` public flag,
 * and the guided tours behind `tour_guide`. */
export const publicFeatureFlags = {
  publicFeatureFlags: [
    { key: 'is_product_visible', enabled: true },
    { key: 'tour_guide', enabled: true },
  ],
};

/** Boot fixtures for the Pod Detail route (/club/:slug/pod/:slug). */
export function podDetailFixtures(over: Record<string, unknown> = {}) {
  return {
    MwebSessionMe: { me },
    PublicFeatureFlags: publicFeatureFlags,
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
  // Explore is reel-only — a pod without a reel is filtered out of the feed.
  reel_url: 'https://cdn.invalid/jazz-reel.mp4',
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
  ...homeFeed(),
  PublicFeatureFlags: publicFeatureFlags,
  MyNotifications: { myNotifications: [], myUnreadNotificationCount: 0 },
  PublicPoliciesNav: { publicPolicies: [] },
  HomeFollowedUsers: { publicUsersByIds: [] },
};

/**
 * "Earn with Duncit" — roles and onboarding meetings, which is everything the
 * journey cards read (`earnBoxState`). One builder rather than a fixture per
 * state: which card is locked is decided by these two lists alone, so a spec
 * says what the user IS and the page follows.
 */
export function earnFixtures(
  over: { roles?: string[]; meetings?: unknown[]; productsVisible?: boolean } = {},
) {
  const productsVisible = over.productsVisible ?? true;
  const roles = over.roles ?? ['USER'];
  // The roles go on EVERY query that returns `me`, not just EarnMe. Apollo
  // normalises all of them to the same `User:u1`, so a boot query still
  // answering `['USER']` lands after EarnMe and overwrites the roles under the
  // page: the "Already enabled" chip and its CTA appear and then vanish
  // mid-click. One user, one set of roles — which is what the server returns.
  const viewer = { ...me, roles };
  return {
    ...bootFixtures,
    MwebSessionMe: { me: viewer },
    AppHeader: { ...appHeader, me: viewer },
    PublicFeatureFlags: {
      publicFeatureFlags: [
        { key: 'is_product_visible', enabled: productsVisible },
        { key: 'tour_guide', enabled: true },
      ],
    },
    EarnMe: {
      me: { user_id: viewer.user_id, roles },
      myMeetings: over.meetings ?? [],
    },
  };
}

/** An onboarding meeting for one journey. `status`/`approval_status` are what
 * move a card between "Meeting scheduled" and "Onboarding in process." */
export function earnMeeting(over: Record<string, unknown> = {}) {
  return {
    id: 'mtg1',
    request_no: 'DUN-MTG-000001',
    kind: 'HOST',
    status: 'SCHEDULED',
    approval_status: 'NONE',
    onboarded_status: null,
    scheduled_at: future(2),
    requested_at: past(1),
    reschedule_count: 0,
    ...over,
  };
}

/** An approved, active host profile. The create-pod gate accepts EITHER the
 * HOST role or this, so a spec can exercise the legacy host that has one and
 * not the other. */
export const myHost = {
  id: 'host1',
  status: 'APPROVED',
  is_active: true,
  /*
    One id, `cat1`, has to be three things at once: the club's `category_id`,
    this host's `sub_category_id`, and the `subCategories` row.

    `filterClubs` keys a host category as `super|SUB` and then asks whether the
    club's `super|category_id` is in that set, and the stepper looks a pod's
    minimum pax up by the same club `category_id`. Crossed over, the club simply
    never appears in the picker and nothing on screen says why.
  */
  host_categories: [
    {
      super_category_id: 'sc1',
      category_id: 'cat1',
      sub_category_id: 'cat1',
      super_category_name: 'Play',
      category_name: 'Music',
      sub_category_name: 'Music',
    },
  ],
};

/**
 * A venue the pod's club is matched to, with one named space.
 *
 * A named `capacity_items` entry rather than the whole-venue fallback, because
 * a space's label is what the slot list is filtered by — the two have to line
 * up (`slot.space_label === space.label`) or the calendar renders empty with
 * nothing saying why.
 */
export const podVenue = {
  id: 'venue1',
  owner_user_id: 'venue-owner-1',
  location_id: 'loc1',
  venue_name: 'Indiranagar Studio',
  venue_type: 'Studio',
  capacity: 30,
  capacity_items: [{ label: 'Main Hall', capacity: 24 }],
  cover_image_url: 'https://img/venue.jpg',
  city: 'Bengaluru',
  locality: 'Indiranagar',
  address_line1: '100 Feet Road',
  state: 'Karnataka',
  postal_code: '560038',
  country: 'India',
  lat: 12.97,
  lng: 77.64,
  owner_name: 'Venue Owner',
  owner_phone: '9999999999',
  owner_email: 'venue@duncit.com',
  is_active: true,
};

/** One published slot on {@link podVenue}'s Main Hall. Picking it is what sets
 * the pod's start and end — a physical pod never types a date. */
export const venueSlot = {
  id: 'slot1',
  start_at: future(7),
  end_at: new Date(Date.now() + 7 * DAY + 2 * 3_600_000).toISOString(),
  whole_day: false,
  price: 2000,
  space_label: 'Main Hall',
  capacity: 24,
  status: 'AVAILABLE',
};

/**
 * Boot fixtures for `/create-pod`.
 *
 * `CreatePodOptions` is one query carrying everything the stepper needs, so the
 * whole page hangs off it — and the two things that decide what renders at all
 * are `me.roles` and `myHost`. Both are overridable, because "no host profile"
 * is a state this page exists to handle rather than an error.
 */
export function createPodFixtures(over: Record<string, unknown> = {}) {
  /*
    Apollo normalises every `me` in the app to the same `User:u1`, so the boot
    queries have to agree with this page's about who the viewer is.

    While they disagreed — the boot queries saying `['USER']`, this page saying
    `['USER','HOST']` — whichever response landed LAST decided whether the
    stepper rendered, and the suite failed roughly one run in three with the
    host gate refusing a host. That is a fixture bug, not a flaky page: a real
    server answers one thing about one user.
  */
  const podViewer = (over.me as Record<string, unknown> | undefined) ?? {
    user_id: me.user_id,
    roles: ['USER', 'HOST'],
    selected_location_id: 'loc1',
  };
  const viewer = { ...me, ...podViewer };
  return {
    ...bootFixtures,
    MwebSessionMe: { me: viewer },
    AppHeader: { ...appHeader, me: viewer },
    CreatePodOptions: {
      me: podViewer,
      clubs: [
        {
          ...clubs[0],
          location_id: 'loc1',
          locality: 'Indiranagar',
          matched_venues_count: 1,
          matched_venues: [{ id: 'venue1' }],
        },
      ],
      locations: [{ ...locations[0], active_club_count: 1 }],
      publicVenues: [podVenue],
      myHost,
      subCategories: [{ id: 'cat1', min_pax: 2 }],
      availablePodProducts: [],
      ...over,
    },
  };
}

/**
 * Everything the stepper needs to walk all four steps and publish.
 *
 * The three writes are separate from the reads because a full cycle is the only
 * thing that reaches them: the draft is saved on every step change, the content
 * is screened before publishing, and the publish itself decides where the host
 * lands. `venue_approval_status` is the fork — PENDING sends them to the
 * waiting page, anything else to Host Management.
 */
export function createPodCycleFixtures(
  over: { venueApproval?: string; violations?: unknown[] } = {},
) {
  return {
    ...createPodFixtures(),
    /*
      The walk starts from a draft carrying ONE thing: a cover image.

      A pod cannot be published without one — `refinePublish` runs `hasImageLine`
      over `media_text` — and the cover field is an upload widget, not somewhere
      a URL can be typed. So a spec that filled every visible field would still
      be refused, silently, by a rule belonging to a step it had already left.
      Resuming a draft is how a host who attached a cover earlier comes back to
      finish, which is exactly the state this walks from. Everything else on all
      four steps is typed or clicked.
    */
    MyPodDraftForEdit: {
      myPodDraft: {
        id: 'draft1',
        step: 0,
        // The city too: hydrating a draft REPLACES the initial values, so it
        // skips the `selected_location_id` default a fresh form gets and step 2
        // would refuse to close with no location on a pod the host had already
        // placed. A real saved draft carries the city it was started in.
        payload: JSON.stringify({
          media_text: 'https://img/pod-cover.jpg',
          location_id: 'loc1',
        }),
      },
    },
    CreatePodVenueSlots: { venueAvailableSlots: [venueSlot] },
    SavePodDraft: { savePodDraft: { id: 'draft1' } },
    ModeratePodContent: {
      moderatePodContent: {
        allowed: (over.violations ?? []).length === 0,
        violations: over.violations ?? [],
      },
    },
    PublishPodDraft: {
      publishPodDraft: {
        id: 'pod-new',
        venue_approval_status: over.venueApproval ?? 'PENDING',
      },
    },
  };
}
