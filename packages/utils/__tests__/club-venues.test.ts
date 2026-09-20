/**
 * Which venues a Club Admin may book a pod into — the rule all three surfaces
 * share. The public list is the floor; a club's explicit links narrow it only
 * when it has any, because an empty link list is "never attached", not "none
 * allowed" (that reading is what emptied the picker).
 */
import { describe, expect, it } from 'vitest';

import { clubAdminVenueOptions, type BookableVenue } from '../src/club-venues';

const publicVenues: BookableVenue[] = [
  // publicVenues never selects `status`: the server already vouched for it.
  { id: 'v-1' },
  { id: 'v-2', status: 'APPROVED', is_active: true },
  { id: 'v-3', is_active: false },
];
const owned: BookableVenue[] = [
  { id: 'v-2', status: 'APPROVED' },
  { id: 'v-4', status: 'PENDING' },
  { id: 'v-5', status: 'APPROVED', is_active: null },
];

const ids = (venues: readonly BookableVenue[]) => venues.map((venue) => venue.id);

describe('clubAdminVenueOptions', () => {
  it('offers every bookable public and owned venue, once each, when the club has no links', () => {
    for (const club of [null, undefined, {}, { meetup_venues_id: null }, { meetup_venues_id: [] }]) {
      expect(ids(clubAdminVenueOptions(publicVenues, owned, club))).toEqual(['v-1', 'v-2', 'v-5']);
    }
  });

  it('drops an inactive venue and one still awaiting approval, but keeps one with no status at all', () => {
    const offered = ids(clubAdminVenueOptions(publicVenues, owned, null));
    expect(offered).not.toContain('v-3');
    expect(offered).not.toContain('v-4');
    expect(offered).toContain('v-1');
  });

  it('lets the owned copy of a venue stand in for its public twin', () => {
    const [, second] = clubAdminVenueOptions(publicVenues, owned, null);
    expect(second).toBe(owned[0]);
  });

  it('narrows to the venues the club has linked, ignoring links to venues it may not book', () => {
    const club = { meetup_venues_id: ['v-5', 'v-3', 'v-9'] };
    expect(ids(clubAdminVenueOptions(publicVenues, owned, club))).toEqual(['v-5']);
  });
});
