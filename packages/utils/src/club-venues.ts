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
