/**
 * Which venues a Club Admin may book a pod into.
 *
 * Stated once because all three surfaces ask it and all three used to answer
 * differently: the Partners console and mWeb listed `myVenues` — which is
 * `venueService.listMine(uid)`, the venues the signed-in person OWNS — so a
 * club admin who owns no venue got an empty picker and could not schedule a
 * physical pod at all. The native app listed every public venue. The server
 * sides with the app: `clubAdminCreatePod` asserts club membership and never
 * checks the venue against the club.
 *
 * So the public list is the floor, and a club's explicit links narrow it when
 * it has any. An empty `meetup_venues_id` is "this club has never had venues
 * attached", not "this club may use none" — reading it as a whitelist is what
 * made the picker dead.
 *
 * Framework-free on purpose: `@duncit/utils` is one of the few packages the
 * native app can consume, and this rule has to reach it (rules 27 and 40).
 */

/** The venue fields this rule reads — no more, so a trimmed selection works. */
export interface BookableVenue {
  id: string;
  status?: string | null;
  is_active?: boolean | null;
}

/** The club fields this rule reads. */
export interface ClubVenueLinks {
  meetup_venues_id?: readonly string[] | null;
}

/**
 * A venue that can actually take a booking today.
 *
 * An ABSENT status means the server already vouched for it: `publicVenues`
 * returns APPROVED + active rows and does not select `status` at all, so
 * demanding the field here would empty the picker on every surface that reads
 * that list. Only `myVenues` carries unapproved rows, and it does select it.
 */
const isBookable = (venue: Readonly<BookableVenue>): boolean => {
  if (venue.is_active === false) return false;
  return !venue.status || venue.status === 'APPROVED';
};

/**
 * The picker's options, newest rule first.
 *
 * `owned` is folded in so a venue owner who is also a club admin keeps seeing
 * their own venues even before they are public — losing those would trade one
 * empty picker for another.
 */
export function clubAdminVenueOptions<T extends BookableVenue>(
  publicVenues: readonly T[],
  owned: readonly T[],
  club: Readonly<ClubVenueLinks> | null | undefined
): T[] {
  const byId = new Map<string, T>();
  for (const venue of [...publicVenues, ...owned]) {
    if (isBookable(venue)) byId.set(venue.id, venue);
  }
  const linked = club?.meetup_venues_id ?? [];
  if (linked.length === 0) return [...byId.values()];
  const allowed = new Set(linked);
  return [...byId.values()].filter((venue) => allowed.has(venue.id));
}

/** A club as Create Pod offers it (step 1) — one shape for mWeb and the native app. */
export interface CreatePodClub {
  id: string;
  club_name: string;
  location_id?: string | null;
  /** Club's locality (a Location zone_name) — used by the locality filter. */
  locality?: string | null;
  super_category_id?: string | null;
  /** Club's Sub-level category (matched against the host's sub_category_id). */
  category_id?: string | null;
  /** How many APPROVED+active venues auto-match this club (location + category). */
  matched_venues_count?: number | null;
  /** Ids of the venues that match this club — the venue picker is scoped to these. */
  matched_venues?: { id: string }[] | null;
  club_description?: string | null;
  club_feature_images_and_videos?: { url: string; type?: string | null }[] | null;
}

/** The host-category fields the club filter reads. */
export interface HostCategoryKeySource {
  super_category_id?: string | null;
  sub_category_id?: string | null;
}

/** Composite key identifying one host category: `${super}|${sub}`. Shared by the
 * Create Pod category picker and the club filter so selection and matching align. */
export const hostCategoryKeyOf = (category: Readonly<HostCategoryKeySource>) =>
  `${category.super_category_id ?? ''}|${category.sub_category_id ?? ''}`;

export interface ClubFilterOptions {
  hostCategories: readonly HostCategoryKeySource[];
  selectedCategoryKey: string;
  locationId: string;
  locality: string;
  podMode: string;
}

/** Clubs the host may attach a pod to: scoped by the SELECTED host category
 * (Super + Sub) — or all of the host's categories when none is picked yet — then,
 * for physical pods, by the chosen city and (optionally) locality. mWeb and the
 * native app both read this. */
export function filterClubs<C extends CreatePodClub>(clubs: readonly C[], opts: Readonly<ClubFilterOptions>): C[] {
  const activeCategories = opts.selectedCategoryKey
    ? opts.hostCategories.filter((category) => hostCategoryKeyOf(category) === opts.selectedCategoryKey)
    : opts.hostCategories;
  const keys = new Set(activeCategories.filter((category) => category.super_category_id).map(hostCategoryKeyOf));
  const matchesCategory = (club: C) => {
    // A host with no categories is not over-filtered.
    if (keys.size === 0) return true;
    if (!club.super_category_id) return false;
    return keys.has(`${club.super_category_id}|${club.category_id ?? ''}`) || keys.has(`${club.super_category_id}|`);
  };
  return clubs.filter((club) => {
    if (!matchesCategory(club)) return false;
    if (opts.podMode === 'VIRTUAL') return true;
    if (opts.locationId && club.location_id !== opts.locationId) return false;
    return !opts.locality || (club.locality ?? '') === opts.locality;
  });
}
